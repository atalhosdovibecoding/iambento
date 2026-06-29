import MemberArea from "./MemberArea";

export const metadata = {
  title: "Private | Bento Silva"
};

export default function AreaPage() {
  return (
    <main className="member-stage min-h-screen px-4 py-6 text-bone sm:px-8 sm:py-8 lg:px-14">
      <div className="mx-auto max-w-6xl">
        <MemberArea />
      </div>
    </main>
  );
}
