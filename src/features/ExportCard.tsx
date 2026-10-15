import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { snapshot, useStore } from '../store'

const filename = () => `Food Costing Calculator ${new Date().toLocaleDateString('en-CA')}.xlsx`

export function ExportCard() {
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      // Loaded on demand so the zip library and the template stay out of the main bundle.
      const [{ buildWorkbook, exportProblems }, { default: templateUrl }] = await Promise.all([
        import('../lib/exportXlsx'),
        import('../assets/sbfcc-template.xlsx?url'),
      ])
      const data = snapshot(useStore.getState())
      const problems = exportProblems(data)
      if (problems.length) {
        toast.error("Your data doesn't fit the sheet", { description: problems.join(' ') })
        return
      }
      const res = await fetch(templateUrl)
      if (!res.ok) throw new Error(`Template download failed (${res.status})`)
      const bytes = buildWorkbook(new Uint8Array(await res.arrayBuffer()), data)
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = Object.assign(document.createElement('a'), { href: url, download: filename() })
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Spreadsheet downloaded', { description: 'Open it in Google Sheets or Excel.' })
    } catch (e) {
      toast.error("Couldn't create the spreadsheet", { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Export">
      <p className="text-sm text-ink-muted">
        Download your food costing spreadsheet, filled in with your units, ingredients, packaging, OPEX, a tab for each recipe, and this summary.
      </p>
      <Button className="mt-3 w-full" onClick={download} disabled={busy}>
        {busy ? 'Preparing…' : 'Download Excel file'}
      </Button>
      <p className="mt-2 text-xs text-ink-muted">Works best in Google Sheets. Also opens in Excel.</p>
    </Card>
  )
}
