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
        <p className="text-[#2D2D2D] dark:text-[#EDE8E0]">
          Assessment coming soon...
        </p>
      </Modal>
    </>
  );
}


