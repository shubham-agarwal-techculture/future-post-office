import Link from "next/link";
import { notFound } from "next/navigation";
import { LetterDetail } from "@/components/letters/letter-detail";
import { requirePageUser } from "@/lib/auth/guard";
import { LetterAccessError } from "@/lib/letters/access";
import { getLetterForUser } from "@/lib/letters/service";
import type {
  LetterInvitation,
  LetterPublic,
  LetterRead,
} from "@/types/database";

type Props = { params: Promise<{ id: string }> };

export default async function LetterPage({ params }: Props) {
  const user = await requirePageUser();
  const { id } = await params;

  let letter: LetterPublic;
  let reads: LetterRead[];
  let invitations: LetterInvitation[];

  try {
    const result = await getLetterForUser(id, user.id);
    letter = result.letter;
    reads = result.reads;
    invitations = result.invitations;
  } catch (e) {
    if (e instanceof LetterAccessError) notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/inbox" className="text-sm text-ink/50 hover:text-ink">
        ← Timeline
      </Link>
      <div className="mt-6">
        <LetterDetail
          letter={letter}
          reads={reads}
          invitations={invitations}
        />
      </div>
    </div>
  );
}
