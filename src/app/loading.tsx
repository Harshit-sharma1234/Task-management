export default function Loading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div className="h-full bg-linear-accent animate-[shimmer_1.5s_infinite] w-[40%] rounded-r-full shadow-[0_0_12px_var(--color-linear-accent)]" />
    </div>
  );
}
