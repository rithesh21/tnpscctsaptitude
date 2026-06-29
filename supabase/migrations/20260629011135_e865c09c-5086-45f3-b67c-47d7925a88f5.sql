ALTER TABLE public.test_questions DROP CONSTRAINT IF EXISTS test_questions_question_id_fkey;
ALTER TABLE public.test_questions ADD CONSTRAINT test_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE public.user_seen_questions DROP CONSTRAINT IF EXISTS user_seen_questions_question_id_fkey;
ALTER TABLE public.user_seen_questions ADD CONSTRAINT user_seen_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE public.question_reports DROP CONSTRAINT IF EXISTS question_reports_question_id_fkey;
ALTER TABLE public.question_reports ADD CONSTRAINT question_reports_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;