import { useState } from 'react'
import { Button } from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { QuickAddDialog } from '../quick-add/QuickAddDialog'

export default function DashboardPage() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <section aria-labelledby="dashboard-title" className="grid gap-5">
      <PageHeader title="Dashboard" titleId="dashboard-title" />

      <div className="flex flex-wrap items-center gap-3">
        <Button onPress={() => setQuickAddOpen(true)}>Quick Add</Button>
      </div>

      <QuickAddDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </section>
  )
}
