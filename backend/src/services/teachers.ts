import type { TeacherProfileDto } from '@minda/common';
import type { AppContext } from '../lib/context';
import { notFound } from '../lib/errors';
import { activeStudents, levelName, slotsOfClass, snap, split, subjectName } from './snapshot';

export async function teacherProfile(ctx: AppContext, id: string): Promise<TeacherProfileDto> {
  const s = await snap(ctx);
  const t = s.teachers.find((x) => x.id === id);
  if (!t) throw notFound('Teacher');
  return {
    id: t.id, name: t.name, subject: t.subject, contact: t.contact,
    levels: split(t.levelIds).map((l) => levelName(s, l)).filter(Boolean),
    classes: s.classes.filter((c) => c.teacherId === id).map((c) => {
      const students = activeStudents(s).filter((st) => split(st.classIds).includes(c.id)).map((st) => ({
        id: st.id, firstName: st.firstName, guardian: { id: st.guardianId, name: s.guardians.find((g) => g.id === st.guardianId)?.name ?? '' },
      }));
      return { classId: c.id, levelName: levelName(s, c.levelId), subject: subjectName(s, c.subjectId), slots: slotsOfClass(s, c.id), studentCount: students.length, students };
    }),
  };
}
