import Link from "next/link";
import { ArrowRight, CreditCard, FileSearch, FilePlus2, ShieldQuestion } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

const WORKFLOWS = [
  {
    href: "/workflows/claim",
    icon: FilePlus2,
    title: "Hasar Dosyası Aç",
    description:
      "Poliçe numarasını doğrulayıp kaza bilgilerini adım adım toplayarak yeni bir hasar kaydı oluşturur.",
    steps: 3,
  },
  {
    href: "/workflows/claim-status",
    icon: FileSearch,
    title: "Hasar Durumu Sorgula",
    description: "Dosya numarasıyla bir hasar kaydının güncel durumunu görüntüler.",
    steps: 1,
  },
  {
    href: "/workflows/coverage",
    icon: ShieldQuestion,
    title: "Poliçe Teminatı Sorgula",
    description:
      "Bir teminatın (çekici, hırsızlık, yangın...) poliçe kapsamında olup olmadığını kontrol eder; gerekirse sözleşme metninde (RAG) arama yapar.",
    steps: 1,
  },
  {
    href: "/workflows/lost-card",
    icon: CreditCard,
    title: "Kayıp Kart Bildir",
    description: "Müşterinin kartlarını listeler, seçilen kartı dondurup yenisini talep eder.",
    steps: 2,
  },
];

export default function WorkflowsPage() {
  return (
    <>
      <PageHeader
        breadcrumb="İş Akışları"
        title="Rehberli İş Akışları"
        description="Voice Console'daki serbest konuşmanın yapılandırılmış alternatifi — her akış aynı mock-enterprise/RAG API'lerini adım adım bir form üzerinden çağırır."
      />
      <PageBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {WORKFLOWS.map((w) => (
            <Link key={w.href} href={w.href} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-[var(--shadow-md)]">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                    <w.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                    {w.steps} adım
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                  {w.title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{w.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </PageBody>
    </>
  );
}
