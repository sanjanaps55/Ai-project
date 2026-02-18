"use client";

import { useState } from "react";
import { ASSESSMENTS } from "@/constants";
import { AssessmentCard } from "@/components/AssessmentCard";
import { Modal } from "@/components/Modal";

export default function AssessmentsPage() {
  const [activeAssessment, setActiveAssessment] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-4">
        <header className="border-b border-slate-100 pb-2 text-sm dark:border-slate-800">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Guided Assessments
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Explore structured reflections around relationships, stress, and
            self-growth.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {ASSESSMENTS.map((assessment) => (
            <AssessmentCard
              key={assessment.title}
              title={assessment.title}
              description={assessment.description}
              onStart={() => setActiveAssessment(assessment.title)}
            />
          ))}
        </div>
      </div>

      <Modal
        open={!!activeAssessment}
        onClose={() => setActiveAssessment(null)}
        title={activeAssessment ?? undefined}
      >
        <p className="mb-2">
          This is a UI-only preview. In the future, this space will guide you
          through gentle, step-by-step reflections powered by Supabase-backed
          assessments.
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          For now, imagine a calm sequence of questions helping you name your
          emotions, explore patterns, and experiment with kinder self-talk.
        </p>
      </Modal>
    </>
  );
}


