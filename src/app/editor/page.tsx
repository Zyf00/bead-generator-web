import { EditorWorkspace } from '../../components/editor/EditorWorkspace';

interface EditorPageProps {
  searchParams: Promise<{ action?: string }>;
}

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const { action } = await searchParams;

  return <EditorWorkspace initialImportOpen={action === 'import'} />;
}
