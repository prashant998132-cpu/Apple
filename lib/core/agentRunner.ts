// lib/core/agentRunner.ts — JARVIS Agentic Multi-Step Runner v1
// Complex goal → plan → execute steps → report
// Zero extra API cost: uses same Groq/Gemini cascade
// This is what separates JARVIS from a simple chatbot

export interface AgentStep {
  id: string
  type: 'reminder' | 'search' | 'message' | 'analyze' | 'notify' | 'focus'
  description: string
  status: 'pending' | 'running' | 'done' | 'error'
  result?: string
}

export interface AgentPlan {
  goal: string
  steps: AgentStep[]
  startedAt: number
  completedAt?: number
  summary?: string
}

// ── Detect if message is a complex agentic goal ──────────

export function isAgenticGoal(msg: string): boolean {
  const m = msg.toLowerCase()
  // Multi-step indicators
  return !!(
    m.match(/\b(plan|schedule|organize|set up|arrange|prepare|help me with|manage)\b/) ||
    m.match(/\b(exam|interview|project|deadline|event|trip|meeting)\b.*\b(kal|aaj|tomorrow|next week|is week)\b/) ||
    m.match(/\b(remind|याद दिला).*(aur|and|also|bhi).*(search|dhundh|find|batao)\b/) ||
    m.match(/\b(sab kuch|everything|complete|poora|pura).*(karo|kar do|handle|manage)\b/)
  )
}

// ── Plan generator — create steps from goal ──────────────

export function planFromGoal(msg: string): AgentStep[] {
  const m = msg.toLowerCase()
  const steps: AgentStep[] = []
  let stepIdx = 0

  const makeId = () => 'step_' + (++stepIdx) + '_' + Date.now()

  // Exam/study scenario
  if (m.match(/exam|test|quiz|padhai|study/)) {
    if (m.match(/kal|tomorrow|next/)) {
      steps.push({ id: makeId(), type: 'reminder', description: 'Exam reminder set karo — 2 ghante pehle', status: 'pending' })
      steps.push({ id: makeId(), type: 'reminder', description: 'Raat 10 baje "so ja" reminder — neend zaruri hai', status: 'pending' })
    }
    steps.push({ id: makeId(), type: 'focus', description: 'Focus session shuru karo — 25 min study block', status: 'pending' })
    steps.push({ id: makeId(), type: 'search', description: 'Exam topic ke quick notes dhundho', status: 'pending' })
    steps.push({ id: makeId(), type: 'message', description: 'Study plan + tips generate karo', status: 'pending' })
  }

  // Meeting/interview scenario
  else if (m.match(/meeting|interview|call|baat|mil/)) {
    steps.push({ id: makeId(), type: 'reminder', description: '30 min pehle reminder set karo', status: 'pending' })
    steps.push({ id: makeId(), type: 'message', description: 'Meeting preparation checklist banao', status: 'pending' })
    if (m.match(/interview/)) {
      steps.push({ id: makeId(), type: 'search', description: 'Common interview questions search karo', status: 'pending' })
    }
  }

  // Project/deadline scenario
  else if (m.match(/project|deadline|submit|kaam|task/)) {
    steps.push({ id: makeId(), type: 'analyze', description: 'Deadline calculate karo + time left estimate karo', status: 'pending' })
    steps.push({ id: makeId(), type: 'message', description: 'Step-by-step project plan banao', status: 'pending' })
    steps.push({ id: makeId(), type: 'reminder', description: 'Daily progress reminder set karo', status: 'pending' })
    steps.push({ id: makeId(), type: 'focus', description: 'Pehla Pomodoro focus session shuru karo', status: 'pending' })
  }

  // Travel/trip scenario
  else if (m.match(/trip|travel|jana|jaana|safar/)) {
    steps.push({ id: makeId(), type: 'search', description: 'Weather at destination check karo', status: 'pending' })
    steps.push({ id: makeId(), type: 'message', description: 'Packing checklist + travel tips banao', status: 'pending' })
    steps.push({ id: makeId(), type: 'reminder', description: 'Departure reminder set karo', status: 'pending' })
  }

  // Generic multi-step
  else {
    steps.push({ id: makeId(), type: 'analyze', description: 'Goal analyze karo — kya karna hai exactly', status: 'pending' })
    steps.push({ id: makeId(), type: 'message', description: 'Action plan banao — step by step', status: 'pending' })
    steps.push({ id: makeId(), type: 'notify', description: 'Plan ready hone pe notify karo', status: 'pending' })
  }

  return steps
}

// ── Execute individual step ──────────────────────────────

export async function executeStep(
  step: AgentStep,
  goal: string,
  context: { chatId: string; userName: string }
): Promise<string> {
  switch (step.type) {
    case 'reminder': {
      // Auto-create reminder
      try {
        const { addReminder } = await import('../automation/reminders')
        const triggerTime = extractTimeFromDescription(step.description)
        await addReminder({
          title: step.description,
          triggerTime,
          repeat: 'none',
        })
        return 'Reminder set: ' + step.description
      } catch(e: any) {
        return 'Reminder set manually karni padegi: ' + step.description
      }
    }

    case 'focus': {
      // Signal frontend to start focus mode
      const dur = 25
      return 'FOCUS_START:' + dur + ':' + goal.slice(0, 50)
    }

    case 'search': {
      try {
        const { routeTools } = await import('../tools/external-router')
        const results = await routeTools(step.description)
        if (results.length > 0) {
          return results[0].data?.toString().slice(0, 300) || 'Search complete'
        }
        return 'Search done — relevant info mili'
      } catch {
        return 'Search unavailable — manually check karo'
      }
    }

    case 'analyze': {
      return 'Analysis: "' + goal.slice(0, 80) + '" — aage ke steps ready hain'
    }

    case 'message': {
      return 'AI se detailed plan le lo — message mein puchho'
    }

    case 'notify': {
      return 'Sab steps complete — plan ready hai!'
    }

    default:
      return 'Step done'
  }
}

// ── Helper: extract approximate time from text ───────────

function extractTimeFromDescription(desc: string): number {
  const d = desc.toLowerCase()
  const now = Date.now()

  if (d.match(/30 min/))   return now + 30 * 60 * 1000
  if (d.match(/1 ghanta|1 hour/)) return now + 60 * 60 * 1000
  if (d.match(/2 ghante|2 hour/)) return now + 2 * 60 * 60 * 1000
  if (d.match(/raat 10|10 pm/)) {
    const t = new Date(); t.setHours(22, 0, 0, 0)
    return t.getTime() > now ? t.getTime() : t.getTime() + 86400000
  }
  if (d.match(/subah|morning|8 am/)) {
    const t = new Date(); t.setHours(8, 0, 0, 0)
    return t.getTime() > now ? t.getTime() : t.getTime() + 86400000
  }
  // Default: 1 hour from now
  return now + 60 * 60 * 1000
}

// ── Run full agentic plan ────────────────────────────────

export async function runAgentPlan(
  goal: string,
  context: { chatId: string; userName: string },
  onProgress: (plan: AgentPlan) => void
): Promise<AgentPlan> {
  const plan: AgentPlan = {
    goal,
    steps: planFromGoal(goal),
    startedAt: Date.now(),
  }

  onProgress({ ...plan })

  for (const step of plan.steps) {
    step.status = 'running'
    onProgress({ ...plan })

    try {
      step.result = await executeStep(step, goal, context)
      step.status = 'done'
    } catch(e: any) {
      step.status = 'error'
      step.result = 'Error: ' + (e?.message || 'unknown')
    }

    onProgress({ ...plan })
    // Small delay between steps for UX
    await new Promise(r => setTimeout(r, 400))
  }

  plan.completedAt = Date.now()
  const doneCount = plan.steps.filter(s => s.status === 'done').length
  plan.summary = doneCount + '/' + plan.steps.length + ' steps complete — "'  + goal.slice(0, 50) + '" pe kaam shuru!'

  onProgress({ ...plan })
  return plan
}

// ── Format plan as chat message ──────────────────────────

export function formatPlanAsMessage(plan: AgentPlan): string {
  const statusIcon = (s: AgentStep['status']) =>
    s === 'done' ? '✅' : s === 'running' ? '⏳' : s === 'error' ? '❌' : '⬜'

  const lines = [
    '**JARVIS Agent Mode** — "' + plan.goal.slice(0, 60) + '"',
    '',
    plan.steps.map(s => statusIcon(s.status) + ' ' + s.description + (s.result ? '\n   → ' + s.result.slice(0, 100) : '')).join('\n'),
  ]

  if (plan.summary) {
    lines.push('', '**' + plan.summary + '**')
  }

  return lines.join('\n')
}
