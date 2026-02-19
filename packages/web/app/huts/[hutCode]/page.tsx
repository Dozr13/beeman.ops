import { HutDashboard } from '../../../components/hut/HutDashboard'

type Props = { params: Promise<{ hutCode: string }> }

export default async function HutPage({ params }: Props) {
  const { hutCode } = await params
  return <HutDashboard siteCode={hutCode} />
}
