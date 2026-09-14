import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { SettingsForm } from "@/components/SettingsForm";
import { getServiceUrls, SERVICE_DEFAULTS } from "@/lib/serviceConfig";

export default async function SettingsPage() {
  const current = await getServiceUrls();

  return (
    <>
      <PageHeader
        breadcrumb="Ayarlar"
        title="Ayarlar"
        description="Konsol, iş akışları ve dashboard'un konuştuğu servislerin adreslerini yönetin."
      />
      <PageBody className="max-w-2xl">
        <SettingsForm initial={current} defaults={SERVICE_DEFAULTS} />
      </PageBody>
    </>
  );
}
