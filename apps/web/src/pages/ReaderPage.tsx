import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import type { Book } from '@smartteacherbook/shared';
import { InteractiveReader } from '../components/reader/InteractiveReader';
import { webApi } from '../services/api/webApi';
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react';

export const ReaderPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [initialPage, setInitialPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadBook = async () => {
      if (!bookId) {
        setError('Darslik ID körsatilmadi');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let foundBook: Book | null = null;
        try {
          foundBook = await webApi.getBookById(bookId);
        } catch {
          const all = await webApi.getAllBooks().catch(() => []);
          foundBook = all.find((b) => b.id === bookId) || null;
        }

        if (!mounted) return;

        if (foundBook) {
          setBook(foundBook);

          const paramPage = parseInt(searchParams.get('page') || '', 10);
          if (!isNaN(paramPage) && paramPage > 0) {
            setInitialPage(paramPage);
          } else {
            try {
              const prog = await webApi.getReadingProgress();
              const last = prog.find((p) => p.bookId === foundBook?.id);
              if (last && last.lastPageNumber > 0) {
                setInitialPage(last.lastPageNumber);
              } else if (foundBook.contentStartPdfPage && foundBook.contentStartPdfPage > 1) {
                setInitialPage(foundBook.contentStartPdfPage);
              }
            } catch {
              // ignore progress error
            }
          }
        } else {
          setError('Darslik topilmadi');
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Darslikni yuklab bölmadi');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBook();
    return () => {
      mounted = false;
    };
  }, [bookId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F2] dark:bg-[#15181E] flex flex-col items-center justify-center gap-4 text-[#1F2933] dark:text-[#E6E8EC]">
        <Loader2 className="w-10 h-10 text-[#2A4FB8] dark:text-[#5B93FA] animate-spin" />
        <span className="text-sm font-bold text-[#5B6672] dark:text-[#9AA3B0]">Darslik ochilmoqda...</span>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#F4F5F2] dark:bg-[#15181E] flex flex-col items-center justify-center p-6 text-[#1F2933] dark:text-[#E6E8EC] text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#FEF2F2] dark:bg-red-500/20 text-[#B91C1C] dark:text-[#F87171] flex items-center justify-center">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#1F2933] dark:text-white">{error || 'Darslik topilmadi'}</h2>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2A4FB8] hover:bg-[#223F94] text-white text-xs font-bold shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kabinetga qaytish</span>
        </button>
      </div>
    );
  }

  return (
    <InteractiveReader
      book={book}
      initialPage={initialPage}
      onExit={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/dashboard');
        }
      }}
    />
  );
};
