
import Something from '../../[testId]/enrollments/create/page'

export default function FacultyEditTestPage({ params }: { params: { languageId: string, testId: string } }) {
  return <FacultyCreateOrEditTestPage params={params} />;
}
