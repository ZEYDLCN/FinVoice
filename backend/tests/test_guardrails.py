from backend.agents.guardrails import detect_hard_handoff_trigger


def test_explicit_human_request_detected():
    assert detect_hard_handoff_trigger("Bir temsilciyle görüşmek istiyorum.") is not None
    assert detect_hard_handoff_trigger("Operatöre bağlanabilir miyim?") is not None
    assert detect_hard_handoff_trigger("Canlı destek almak istiyorum.") is not None


def test_frustration_detected():
    assert detect_hard_handoff_trigger("Bu rezalet bir durum!") is not None
    assert detect_hard_handoff_trigger("Yeter artık, çok sinir bozucu.") is not None
    assert detect_hard_handoff_trigger("Avukatıma danışacağım.") is not None


def test_normal_message_not_triggered():
    assert detect_hard_handoff_trigger("Arabamla kaza yaptım, hasar dosyası açtırmak istiyorum.") is None
    assert detect_hard_handoff_trigger("TR-92831 poliçemi kontrol eder misin?") is None


def test_reason_text_distinguishes_categories():
    human_reason = detect_hard_handoff_trigger("Temsilciyle konuşmak istiyorum.")
    frustration_reason = detect_hard_handoff_trigger("Bu berbat bir hizmet.")
    assert human_reason != frustration_reason
