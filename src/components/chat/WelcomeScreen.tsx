import { BookOpen, Compass, Languages, Sparkles } from 'lucide-react';
import { Logo } from '../ui/Logo';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const STARTER_PROMPTS = [
  {
    icon: Languages,
    label: 'Tulu Greetings',
    prompt: 'Encha ullar? Teach me everyday Tulu greetings in Roman script and Kannada script.',
  },
  {
    icon: Sparkles,
    label: 'Culture & Traditions',
    prompt: 'Tell me about Bhoota Kola and Yakshagana traditions in Tulunadu.',
  },
  {
    icon: BookOpen,
    label: 'Tulunadu Cuisine',
    prompt: 'What are traditional Tulunadu dishes like Kori Rotti, Neer Dosa, and Patrode?',
  },
  {
    icon: Compass,
    label: 'History & Geography',
    prompt: 'Explain the history, rivers, and coastal geography of Tulunadu.',
  },
];

export function WelcomeScreen({ onSelectPrompt, disabled = false }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
      <div className="mb-5">
        <Logo size="lg" />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-[#1C1917] sm:text-3xl">
        Namaskara! Ask anything about Tulunadu.
      </h1>

      <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#57534E] sm:text-[15px]">
        Explore Tulu vocabulary, grammar, folklore, cuisine, history, and geography. You
        can write in <strong>English</strong>, <strong>Roman Tulu</strong> (e.g.{' '}
        <span className="italic">Encha ullar?</span>), or <strong>Kannada script</strong>.
      </p>

      <div className="mt-8 grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
        {STARTER_PROMPTS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex items-start gap-3 rounded-2xl border border-[#E5DEC9] bg-white p-3.5 text-left transition hover:border-[#C2410C]/40 hover:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/40 disabled:opacity-50"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAF7F2] text-[#9A3412] transition group-hover:bg-[#9A3412]/10">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1C1917]">{item.label}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#57534E]">
                  {item.prompt}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
