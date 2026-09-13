"""Drives the real LangGraph agent graph (real tools, real tool-calling
loop, real checkpointer) with a `ScriptedChatModel` standing in for Ollama.
No network to an LLM is needed; mock-enterprise calls go through `respx`.
"""
from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.graph import build_graph
from backend.llm.fake import ScriptedChatModel


async def test_single_tool_call_then_reply(mock_enterprise):
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_policy", "args": {"policy_number": "TR-92831"}, "id": "c1"}
                ],
            ),
            AIMessage(content="Poliçeniz aktif görünüyor."),
        ]
    )
    graph = build_graph(model)
    tool_log: list[dict] = []
    handoff_box: dict = {}

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="TR-92831 poliçemi kontrol eder misin?")]},
        config={"configurable": {"thread_id": "t1", "tool_log": tool_log, "handoff_box": handoff_box}},
    )

    assert result["messages"][-1].content == "Poliçeniz aktif görünüyor."
    assert len(tool_log) == 1
    assert tool_log[0]["name"] == "get_policy"
    assert tool_log[0]["status"] == "success"
    assert tool_log[0]["output"]["status"] == "ACTIVE"
    assert handoff_box == {}


async def test_multi_tool_call_create_claim_flow(mock_enterprise):
    """The full Scenario 1 (spec §2/§34): get_policy then create_claim,
    two separate tool-calling round-trips within one turn."""
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_policy", "args": {"policy_number": "TR-92831"}, "id": "c1"}
                ],
            ),
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "create_claim",
                        "args": {
                            "policy_number": "TR-92831",
                            "accident_date": "2026-09-10",
                            "location": "Istanbul",
                            "description": "Rear collision",
                        },
                        "id": "c2",
                    }
                ],
            ),
            AIMessage(content="Hasar kaydınız oluşturuldu: CLM-98221"),
        ]
    )
    graph = build_graph(model)
    tool_log: list[dict] = []

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="Kaza yaptım, hasar dosyası açar mısın?")]},
        config={"configurable": {"thread_id": "t2", "tool_log": tool_log, "handoff_box": {}}},
    )

    assert "CLM-98221" in result["messages"][-1].content
    assert [c["name"] for c in tool_log] == ["get_policy", "create_claim"]
    assert all(c["status"] == "success" for c in tool_log)


async def test_transfer_to_human_ends_turn_immediately():
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "transfer_to_human",
                        "args": {"reason": "Kullanıcı temsilci istedi"},
                        "id": "c1",
                    }
                ],
            ),
            # Deliberately only one canned response: if the graph looped
            # back to the agent instead of ending after handoff, this test
            # would fail with "ran out of canned responses".
        ]
    )
    graph = build_graph(model)
    tool_log: list[dict] = []
    handoff_box: dict = {}

    await graph.ainvoke(
        {"messages": [HumanMessage(content="Bir temsilciyle görüşmek istiyorum.")]},
        config={"configurable": {"thread_id": "t3", "tool_log": tool_log, "handoff_box": handoff_box}},
    )

    assert handoff_box["reason"] == "Kullanıcı temsilci istedi"
    assert tool_log[0]["name"] == "transfer_to_human"


async def test_tool_error_is_logged_and_surfaced_to_model(mock_enterprise):
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_policy", "args": {"policy_number": "UNKNOWN"}, "id": "c1"}
                ],
            ),
            AIMessage(content="Bu poliçe numarasını bulamadım."),
        ]
    )
    graph = build_graph(model)
    tool_log: list[dict] = []

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="UNKNOWN poliçemi kontrol et.")]},
        config={"configurable": {"thread_id": "t4", "tool_log": tool_log, "handoff_box": {}}},
    )

    assert tool_log[0]["status"] == "error"
    assert "not found" in tool_log[0]["error"]
    assert result["messages"][-1].content == "Bu poliçe numarasını bulamadım."


async def test_memory_persists_across_turns_for_same_thread():
    """Exercises the LangGraph checkpointer: a second call on the same
    thread_id should see the first turn's messages already in state,
    without any session store of our own (contrast with Faz 2/3's
    hand-rolled in-memory session stores)."""
    model = ScriptedChatModel(
        responses=[
            AIMessage(content="Merhaba! Size nasıl yardımcı olabilirim?"),
            AIMessage(content="Elbette, poliçe numaranızı paylaşır mısınız?"),
        ]
    )
    graph = build_graph(model)
    cfg = {"configurable": {"thread_id": "same-thread", "tool_log": [], "handoff_box": {}}}

    await graph.ainvoke({"messages": [HumanMessage(content="Merhaba")]}, config=cfg)
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="Hasar dosyası açmak istiyorum")]}, config=cfg
    )

    assert len(result["messages"]) == 4  # 2 human + 2 ai, both turns


async def test_rag_tool_call_for_unstructured_policy_question(mock_rag):
    """Scenario from spec §13: a question the structured mock-enterprise API
    can't answer (İkame araç kaç gün sağlanır?) goes to RAG instead."""
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "search_policy_documents",
                        "args": {"query": "İkame araç kaç gün sağlanır?"},
                        "id": "c1",
                    }
                ],
            ),
            AIMessage(content="İkame araç hizmeti en fazla 15 gün sağlanır."),
        ]
    )
    graph = build_graph(model)
    tool_log: list[dict] = []

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content="İkame araç kaç gün sağlanır?")]},
        config={"configurable": {"thread_id": "t5", "tool_log": tool_log, "handoff_box": {}}},
    )

    assert tool_log[0]["name"] == "search_policy_documents"
    assert tool_log[0]["status"] == "success"
    assert "kasko_sartlari.pdf" in str(tool_log[0]["output"])
    assert "15 gün" in result["messages"][-1].content
