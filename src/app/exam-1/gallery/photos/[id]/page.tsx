export default async function CanonicalPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1>photo {id}</h1>;
}
