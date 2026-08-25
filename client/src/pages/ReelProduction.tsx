import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleAlert, Film, FolderCheck, Loader2 } from "lucide-react";

export default function ReelProduction() {
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const overview = trpc.reels.overview.useQuery(undefined, { enabled: isAuthenticated });
  const toggle = trpc.reels.setContinuation.useMutation({ onSuccess: () => utils.reels.overview.invalidate() });
  if (loading || overview.isLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;
  if (!isAuthenticated || !user) return <div className="min-h-screen grid place-items-center p-8">Sign in to review the production queue.</div>;
  if (user.role !== "admin") return <div className="min-h-screen grid place-items-center p-8">Owner access is required for the production queue.</div>;
  const data = overview.data; if (!data) return null;
  return <main className="min-h-screen bg-[#f7f5f0] text-[#261d2b] p-5 md:p-10"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold tracking-[0.2em] text-[#8b5e3c]">REEL PRODUCTION / OWNER VIEW</p><h1 className="mt-2 text-3xl font-semibold">Hindi Research Reels</h1><p className="mt-2 max-w-2xl text-sm text-[#665b66]">Drive-verified completion ledger. A reel is never counted delivered until its package is verified.</p></div><div className="rounded-full bg-white px-4 py-2 text-sm shadow-sm">Batch {String(data.settings.activeBatchNumber).padStart(3, "0")} · Next Reel {String(data.metrics.nextReelNumber).padStart(4, "0")}</div></header>
    <section className="grid gap-4 md:grid-cols-4">{[["Verified delivery",data.metrics.delivered,FolderCheck],["Blocked",data.metrics.blocked,CircleAlert],["Next reel",data.metrics.nextReelNumber,Film],["Queue status",data.settings.isEnabled?"Enabled":"Paused",CheckCircle2]].map(([label,value,Icon]) => { const I=Icon as typeof Film; return <Card key={String(label)} className="border-0 shadow-sm"><CardContent className="pt-5"><I className="h-5 w-5 text-[#9a6b43]"/><p className="mt-3 text-2xl font-semibold">{String(value)}</p><p className="text-sm text-[#756a75]">{String(label)}</p></CardContent></Card>; })}</section>
    <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center justify-between text-base">Daily continuation <Switch checked={data.settings.isEnabled} onCheckedChange={checked=>toggle.mutate({enabled:checked})} disabled={toggle.isPending}/></CardTitle></CardHeader><CardContent className="text-sm text-[#665b66]">The next run must read the verified Drive checkpoint, research only the next unique reel, record any blocker, and never claim a delivery without Drive verification.</CardContent></Card>
    <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Recent production ledger</CardTitle></CardHeader><CardContent className="space-y-3">{data.items.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fbfaf8] p-4"><div><p className="font-medium">Reel {String(item.reelNumber).padStart(4,"0")} · {item.title}</p><p className="mt-1 text-xs text-[#756a75]">{item.category} · evidence {item.evidenceStatus}</p></div><div className="text-right text-sm"><p className={item.deliveryVerified?"text-emerald-700":"text-amber-700"}>{item.deliveryVerified?"Drive verified":"Not delivered"}</p><p className="text-xs text-[#756a75]">{item.productionStatus}</p></div></div>)}</CardContent></Card>
  </div></main>;
}
