export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1>Gallery</h1>
      {children}
    </div>
  );
}
