'use client'

import React from 'react'
import Container from './ui/Container'
import { ShieldCheck, Lock, FileText } from 'lucide-react'

function Item({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="card flex gap-4 items-start">
      <div className="p-2 rounded-md bg-black/20">
        <Icon size={20} />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-muted text-sm mt-1">{text}</div>
      </div>
    </div>
  )
}

export default function SecurityCompliance() {
  return (
    <section id="security" className="py-20">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold">Security & Compliance</h2>
          <p className="mt-3 text-muted">
            Security and compliance are foundational — built to enterprise standards with layered technical and process controls.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Item icon={ShieldCheck} title="Enterprise-grade controls" text="Role-based access, audit trails, and continuous monitoring." />
          <Item icon={Lock} title="Data protection" text="Encryption at rest and in transit, strict key management." />
          <Item icon={FileText} title="Regulatory compliance" text="Workflows and processes aligned with relevant regulatory frameworks." />
        </div>
      </Container>
    </section>
  )
}
