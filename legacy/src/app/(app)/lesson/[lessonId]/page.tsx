import { notFound } from "next/navigation";
import { findUnitForLesson, getLessonFromCurriculum } from "@/lib/lesson/player";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";

type Params = { lessonId: string };

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { lessonId } = await params;
  const unit = findUnitForLesson(lessonId);
  const lesson = getLessonFromCurriculum(lessonId, unit);
  if (!lesson) {
    notFound();
  }
  return <LessonPlayer lesson={lesson} />;
}