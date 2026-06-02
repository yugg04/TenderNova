import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default async function ChatbotPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email ?? '' }, include: { tenders: { orderBy: { createdAt: 'desc' } } } });
  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl font-bold">AI Chatbot</h1><p className="mt-1 text-slate-400">Ask TenderNova AI questions about a selected tender.</p></div>
      <ChatInterface tenders={user?.tenders ?? []} />
    </div>
  );
}
