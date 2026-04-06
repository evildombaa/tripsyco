DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP TABLE IF EXISTS public.expenses;