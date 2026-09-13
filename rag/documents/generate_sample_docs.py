"""Generates the sample policy/product documents this RAG pipeline indexes.

These are NOT real insurance/banking terms — they're synthetic content
written for this demo (consistent with mock-enterprise's synthetic seed
data), covering the kind of unstructured, "read the fine print" questions
that structured APIs like `check_policy_coverage` can't answer (spec §13:
"Kaskom çekici hizmetini kapsıyor mu?" is structured; "İkame araç kaç gün
sağlanır?" is not).

Run this to regenerate the committed PDFs after editing the content below:

    python rag/documents/generate_sample_docs.py
"""
from pathlib import Path

from fpdf import FPDF

ASSETS_DIR = Path(__file__).parent.parent / "assets" / "fonts"
OUT_DIR = Path(__file__).parent

FONT_REGULAR = ASSETS_DIR / "DejaVuSans.ttf"
FONT_BOLD = ASSETS_DIR / "DejaVuSans-Bold.ttf"


def _make_pdf() -> FPDF:
    pdf = FPDF()
    pdf.add_font("DejaVu", "", str(FONT_REGULAR))
    pdf.add_font("DejaVu", "B", str(FONT_BOLD))
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    return pdf


def _write_sections(pdf: FPDF, title: str, sections: list[tuple[str, str]]) -> None:
    pdf.set_font("DejaVu", "B", 16)
    pdf.multi_cell(0, 10, title)
    pdf.ln(4)
    for heading, body in sections:
        pdf.set_font("DejaVu", "B", 12)
        pdf.multi_cell(0, 8, heading)
        pdf.ln(1)
        pdf.set_font("DejaVu", "", 11)
        # align="L": fpdf2's default "justify" pads inter-word spacing with
        # extra spaces, which would leak into the extracted text (and thus
        # into the RAG chunks/embeddings) as spurious double spaces.
        pdf.multi_cell(0, 6, body, align="L")
        pdf.ln(3)


KASKO_SECTIONS: list[tuple[str, str]] = [
    (
        "1. Teminat Kapsamı",
        "Bu poliçe; çarpışma, çalınma, yangın, cam kırılması ve çekici hizmeti "
        "teminatlarını, poliçe üzerinde belirtilen sigorta bedeli ile sınırlı "
        "olmak üzere kapsar. Teminat kapsamı ve sigorta bedeli poliçe "
        "belgesinde ayrıca gösterilir.",
    ),
    (
        "2. İkame Araç Hizmeti",
        "Onarım süresi 7 (yedi) günü aşan hasar dosyalarında sigortalıya, "
        "hasarlı araçla aynı sınıfta bir ikame araç sağlanır. İkame araç "
        "hizmeti en fazla 15 (on beş) gün süreyle verilir; bu sürenin "
        "aşılması durumunda ek ücret sigortalıya aittir.",
    ),
    (
        "3. Doğal Afet İstisnası",
        "Deprem, sel ve su baskını kaynaklı hasarlar standart kasko teminatı "
        "kapsamı dışındadır. Bu risklere karşı koruma, ek prim ödenerek "
        "satın alınabilecek ayrı bir 'Doğal Afet Teminatı' ile sağlanır.",
    ),
    (
        "4. Manevi Tazminat İstisnası",
        "Kaza sonucu üçüncü şahıslarca talep edilebilecek manevi tazminat "
        "talepleri bu poliçe kapsamında karşılanmaz.",
    ),
    (
        "5. Hasarsızlık İndirimi",
        "Art arda 3 (üç) sigorta dönemi boyunca hasarsız geçiren "
        "sigortalılara, yenileme priminde %20 (yüzde yirmi) hasarsızlık "
        "indirimi uygulanır.",
    ),
    (
        "6. Hasar Bildirim Süresi",
        "Sigortalı, kaza veya hasar durumunu öğrendiği tarihten itibaren "
        "5 (beş) iş günü içinde şirkete bildirmekle yükümlüdür. Bu sürenin "
        "aşılması, hasar dosyasının değerlendirme süresini uzatabilir ve "
        "ek belge talep edilmesine neden olabilir.",
    ),
    (
        "7. Eksper Süreci",
        "Tahmini hasar tutarı 50.000 TL'yi aşan dosyalarda bağımsız eksper "
        "ataması zorunludur. Eksper raporu tamamlanmadan hasar ödemesi "
        "yapılmaz.",
    ),
]

KART_SECTIONS: list[tuple[str, str]] = [
    (
        "1. Kayıp veya Çalıntı Bildirimi",
        "Kartın kaybolması veya çalınması durumunda müşteri, durumu derhal "
        "çağrı merkezine veya mobil uygulama üzerinden bildirmekle "
        "yükümlüdür. Bildirim anından önce gerçekleşen yetkisiz işlemlerde "
        "müşterinin sorumluluğu en fazla 750 TL ile sınırlıdır; bildirim "
        "anından sonra gerçekleşen işlemlerden müşteri sorumlu tutulmaz.",
    ),
    (
        "2. Yeni Kart Teslim Süresi",
        "Kayıp/çalıntı bildirimi sonrası oluşturulan yeni kart talebi, "
        "talep tarihinden itibaren 5 (beş) iş günü içinde müşterinin kayıtlı "
        "adresine teslim edilir.",
    ),
    (
        "3. Yurt Dışı İşlem Ücreti",
        "Yurt dışında gerçekleştirilen POS ve online alışverişlerde işlem "
        "tutarı üzerinden %2,5 (yüzde iki virgül beş) yurt dışı hizmet "
        "bedeli tahsil edilir.",
    ),
    (
        "4. Gecikme Faizi",
        "Asgari ödeme tutarının son ödeme tarihine kadar yatırılmaması "
        "halinde, gecikilen bakiyeye aylık %3,5 (yüzde üç virgül beş) "
        "gecikme faizi uygulanır.",
    ),
    (
        "5. Ek Kart",
        "Ana kart hamili, aile bireyleri adına ek kart talep edebilir. Ek "
        "kartlar için yıllık ek kart ücreti uygulanabilir; ek kart "
        "harcamalarından ana kart hamili müteselsilen sorumludur.",
    ),
]

SSS_SECTIONS: list[tuple[str, str]] = [
    (
        "Hasar dosyam ne kadar sürede sonuçlanır?",
        "Standart hasar dosyaları ortalama 10-15 iş günü içinde "
        "sonuçlandırılır. Bağımsız eksper ataması gereken dosyalarda bu "
        "süre 20 iş gününe kadar uzayabilir.",
    ),
    (
        "Poliçemi nasıl yenilerim?",
        "Poliçe bitiş tarihinden 30 gün önce müşteriye SMS ve e-posta "
        "yoluyla bilgilendirme yapılır. Yenileme, çağrı merkezi, mobil "
        "uygulama veya web sitesi üzerinden gerçekleştirilebilir.",
    ),
    (
        "Kartımı yurt dışında kullanabilir miyim?",
        "Evet, kartlar yurt dışında kullanıma açıktır. Yurt dışı işlemlerde "
        "kart sözleşmesinde belirtilen yurt dışı hizmet bedeli uygulanır.",
    ),
    (
        "Hasar dosyası açmak için hangi bilgiler gerekli?",
        "Poliçe numarası, kaza tarihi, kazanın gerçekleştiği konum ve "
        "kazanın kısa bir açıklaması gereklidir. Poliçenin aktif durumda "
        "olması ön koşuldur.",
    ),
    (
        "Destek talebimi nereden takip edebilirim?",
        "Oluşturulan her destek kaydı bir takip numarası alır; bu numara "
        "ile mobil uygulama veya çağrı merkezi üzerinden durum "
        "sorgulanabilir.",
    ),
]


def main() -> None:
    kasko = _make_pdf()
    _write_sections(kasko, "Kasko Sigortası Genel Şartları", KASKO_SECTIONS)
    kasko.output(str(OUT_DIR / "kasko_sartlari.pdf"))

    kart = _make_pdf()
    _write_sections(kart, "Bireysel Bankacılık Kart Sözleşmesi", KART_SECTIONS)
    kart.output(str(OUT_DIR / "kart_sozlesmesi.pdf"))

    sss = _make_pdf()
    _write_sections(sss, "Sıkça Sorulan Sorular (SSS)", SSS_SECTIONS)
    sss.output(str(OUT_DIR / "sss.pdf"))

    print("Oluşturuldu:")
    for name in ("kasko_sartlari.pdf", "kart_sozlesmesi.pdf", "sss.pdf"):
        print(" -", OUT_DIR / name)


if __name__ == "__main__":
    main()
