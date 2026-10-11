// Lesson content. Text uses $inline math$ and **bold**; the Learn page renders it with the same
// renderer as the solver. Worked examples marked `examples` are NOT typed in: the Learn page runs
// the real solver engine and shows its stages, so the lesson algebra can never disagree with the app.
import type { Block } from '../engine/types'

const T = String.raw

export interface LessonOption { t: string; why?: string }
export interface LessonQuestion { id: string; prompt: string; options: LessonOption[]; answer: number; explain: string }
export interface LessonExample { title: string; matrix: number[][]; stages: number[] /* 1-based stage numbers */; intro?: string }
export interface Lesson {
  id: string
  title: string
  tagline: string
  glyph: string
  blocks: Block[]
  viz?: 'det' | 'transform' | 'rotation' | 'shear'
  examples?: LessonExample[]
  after?: Block[]
  questions: LessonQuestion[]
}

const o = (t: string, why?: string): LessonOption => ({ t, why })

export const LESSONS: Lesson[] = [
  {
    id: 'L1', title: 'What is a matrix?', tagline: 'A grid of numbers that also acts as a machine', glyph: '▦',
    blocks: [
      { t: 'p', text: T`A **matrix** is a rectangular grid of numbers arranged in rows and columns. An $m\times n$ matrix has $m$ rows and $n$ columns, and $a_{ij}$ means the entry in row $i$, column $j$.` },
      { t: 'math', tex: T`B=\begin{bmatrix}1&2&3\\4&5&6\end{bmatrix}\qquad B\text{ is }2\times3,\quad b_{23}=6` },
      { t: 'p', text: T`A matrix is also a **machine**: multiplying it by a vector produces a new vector. Each entry of the result is a row of the matrix multiplied entry by entry with the vector and added up.` },
      { t: 'math', tex: T`\begin{bmatrix}2&1\\1&2\end{bmatrix}\begin{bmatrix}1\\0\end{bmatrix}=\begin{bmatrix}2\cdot1+1\cdot0\\1\cdot1+2\cdot0\end{bmatrix}=\begin{bmatrix}2\\1\end{bmatrix}` },
      { t: 'p', text: T`Notice that the input $(1,0)$ came out as $(2,1)$: it was turned and stretched. Eigenvectors are the special inputs that are **not** turned.` },
      { t: 'note', tone: 'info', text: T`Eigenvalues only make sense for **square** matrices ($n\times n$), because $A\mathbf v$ must have the same size as $\mathbf v$ for the equation $A\mathbf v=\lambda\mathbf v$ to be possible.` },
    ],
    questions: [
      { id: 'q1', prompt: T`What is the size of $B=\begin{bmatrix}1&2&3\\4&5&6\end{bmatrix}$?`, answer: 1, explain: T`Size is always rows × columns. $B$ has 2 rows and 3 columns, so it is $2\times3$.`,
        options: [o(T`$3\times2$`, 'That swaps rows and columns. Count rows first.'), o(T`$2\times3$`), o(T`$2\times2$`, 'It has three columns, so it is not square.'), o(T`$6\times1$`, 'That is the number of entries, not the size.')] },
      { id: 'q2', prompt: T`Compute $\begin{bmatrix}2&1\\1&2\end{bmatrix}\begin{bmatrix}1\\1\end{bmatrix}$.`, answer: 2, explain: T`Row 1: $2\cdot1+1\cdot1=3$. Row 2: $1\cdot1+2\cdot1=3$. The result is $(3,3)$, which points the same way as $(1,1)$. Remember this one.`,
        options: [o(T`$\begin{bmatrix}2\\2\end{bmatrix}$`, 'You multiplied only the diagonal entries and forgot to add the other term in each row.'), o(T`$\begin{bmatrix}1\\1\end{bmatrix}$`, 'That is the input vector. The matrix changes it.'), o(T`$\begin{bmatrix}3\\3\end{bmatrix}$`), o(T`$\begin{bmatrix}4\\4\end{bmatrix}$`, 'Add the products within each row: 2+1, not 2+2.')] },
    ],
  },
  {
    id: 'L2', title: 'The identity matrix', tagline: 'The matrix that does nothing, and why we need it', glyph: 'I',
    blocks: [
      { t: 'p', text: T`The **identity matrix** $I$ has 1s on the main diagonal and 0s everywhere else. Multiplying by it changes nothing: $IA=AI=A$ and $I\mathbf v=\mathbf v$.` },
      { t: 'math', tex: T`I_2=\begin{bmatrix}1&0\\0&1\end{bmatrix},\qquad I_3=\begin{bmatrix}1&0&0\\0&1&0\\0&0&1\end{bmatrix}` },
      { t: 'p', text: T`Why does it matter here? The equation $A\mathbf v=\lambda\mathbf v$ mixes a matrix with a plain number. To subtract them we first turn the number into a matrix: $\lambda I$ is $\lambda$ on the diagonal.` },
      { t: 'math', tex: T`A=\begin{bmatrix}3&1\\2&4\end{bmatrix},\quad \lambda=2:\qquad A-\lambda I=\begin{bmatrix}3&1\\2&4\end{bmatrix}-\begin{bmatrix}2&0\\0&2\end{bmatrix}=\begin{bmatrix}1&1\\2&2\end{bmatrix}` },
      { t: 'note', tone: 'warn', text: T`$A-\lambda I$ subtracts $\lambda$ from the **diagonal entries only**. A common slip is subtracting it from every entry.` },
    ],
    questions: [
      { id: 'q1', prompt: T`For $A=\begin{bmatrix}3&-1\\2&5\end{bmatrix}$, what is $AI$?`, answer: 0, explain: T`Multiplying by the identity leaves a matrix unchanged, so $AI=A$.`,
        options: [o(T`$A$ itself`), o(T`The zero matrix`, 'The identity does not erase anything.'), o(T`$I$`, 'That would only happen if $A$ were the identity.'), o(T`$A^2$`, 'We multiplied by $I$, not by $A$.')] },
      { id: 'q2', prompt: T`For $A=\begin{bmatrix}3&1\\2&4\end{bmatrix}$, compute $A-2I$.`, answer: 2, explain: T`$2I$ is $\begin{bmatrix}2&0\\0&2\end{bmatrix}$, so only the diagonal changes: $3-2=1$ and $4-2=2$.`,
        options: [o(T`$\begin{bmatrix}1&-1\\0&2\end{bmatrix}$`, 'That subtracts 2 from every entry, including the off-diagonal ones.'), o(T`$\begin{bmatrix}5&1\\2&6\end{bmatrix}$`, 'That adds 2 instead of subtracting.'), o(T`$\begin{bmatrix}1&1\\2&2\end{bmatrix}$`), o(T`$\begin{bmatrix}3&1\\2&4\end{bmatrix}$`, 'Nothing was subtracted.')] },
    ],
  },
  {
    id: 'L3', title: 'The determinant', tagline: 'One number that says whether a matrix squashes space', glyph: 'det',
    viz: 'det',
    blocks: [
      { t: 'p', text: T`The **determinant** of a square matrix is a single number. For a $2\times2$ matrix it is the main diagonal product minus the other diagonal product.` },
      { t: 'math', tex: T`\det\begin{bmatrix}a&b\\c&d\end{bmatrix}=ad-bc` },
      { t: 'math', tex: T`\det\begin{bmatrix}3&1\\2&4\end{bmatrix}=3\cdot4-1\cdot2=10` },
      { t: 'p', text: T`For a $3\times3$ matrix, expand along the first row with alternating signs $+,-,+$, each multiplying a $2\times2$ determinant (the **minor** you get by deleting that row and column).` },
      { t: 'math', tex: T`\det\begin{bmatrix}1&2&0\\0&1&3\\2&0&1\end{bmatrix}=1(1\cdot1-3\cdot0)-2(0\cdot1-3\cdot2)+0(0\cdot0-1\cdot2)=1+12+0=13` },
      { t: 'p', text: T`Geometrically, $|\det A|$ is the factor by which $A$ scales areas (or volumes). Try it: the dashed unit square is mapped to the coloured parallelogram.` },
    ],
    after: [
      { t: 'note', tone: 'tip', text: T`If $\det A=0$ the matrix collapses space onto a line or a point. It is **singular** (has no inverse), and this is exactly the condition that lets $A-\lambda I$ have non-zero solutions in the next lessons.` },
    ],
    questions: [
      { id: 'q1', prompt: T`Find $\det\begin{bmatrix}5&2\\3&4\end{bmatrix}$.`, answer: 3, explain: T`$ad-bc=5\cdot4-2\cdot3=20-6=14$.`,
        options: [o('26', 'You added the products. The formula subtracts them.'), o('20', 'That is only $ad$. Subtract $bc$ as well.'), o('9', 'That is the sum of the diagonal (the trace), not the determinant.'), o('14')] },
      { id: 'q2', prompt: T`$\det A=0$ means that $A$…`, answer: 1, explain: T`A zero determinant means areas are scaled by zero: the plane is squashed onto a line or a point. Such a matrix has no inverse.`,
        options: [o('is the identity matrix', 'The identity has determinant 1.'), o('squashes space and is not invertible'), o('has all entries equal to zero', 'Many non-zero matrices, such as $\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}$, have determinant 0.'), o('must be a $3\\times3$ matrix', 'Any square size can have determinant 0.')] },
    ],
  },
  {
    id: 'L4', title: 'What are eigenvalues?', tagline: 'The stretch factors of a transformation', glyph: 'λ',
    viz: 'transform',
    blocks: [
      { t: 'p', text: T`Most vectors are knocked off their direction when you multiply by a matrix. But a few special directions are only **stretched, shrunk or flipped**. The factor is the **eigenvalue** $\lambda$ (lambda).` },
      { t: 'math', tex: T`A\mathbf v=\lambda\mathbf v` },
      { t: 'list', items: [
        T`$\lambda>1$: the vector is stretched.`,
        T`$0<\lambda<1$: it is shrunk.`,
        T`$\lambda<0$: it is flipped to the opposite direction (and stretched or shrunk).`,
        T`$\lambda=0$: it is squashed to the zero vector, which only happens when $\det A=0$.`,
      ] },
      { t: 'p', text: T`In the picture, the orange arrow is $\mathbf v$ and the pink arrow is $A\mathbf v$. Press play or drag the slider: whenever the two arrows line up, $\mathbf v$ is an eigenvector and the ratio of lengths is the eigenvalue.` },
    ],
    after: [
      { t: 'note', tone: 'good', text: T`Two handy facts for checking your work: the eigenvalues **add up to the trace** (sum of the diagonal) and **multiply to the determinant**. For $\begin{bmatrix}2&1\\1&2\end{bmatrix}$: $3+1=4=2+2$ and $3\cdot1=3=\det A$.` },
    ],
    questions: [
      { id: 'q1', prompt: T`What are the eigenvalues of the diagonal matrix $\begin{bmatrix}2&0\\0&5\end{bmatrix}$?`, answer: 0, explain: T`For a diagonal (or triangular) matrix the eigenvalues are the diagonal entries: $2$ and $5$. The vectors $(1,0)$ and $(0,1)$ are stretched by exactly those factors.`,
        options: [o('2 and 5'), o('0 and 7', 'There is no reason for a 0, and 7 is the trace, not an eigenvalue.'), o('10 only', '10 is the determinant. Eigenvalues multiply to it, they are not equal to it.'), o('2 and 5 are not eigenvalues', 'Check $A(1,0)=(2,0)=2(1,0)$.')] },
      { id: 'q2', prompt: T`A $2\times2$ matrix has eigenvalues $6$ and $-1$. What is its trace?`, answer: 1, explain: T`The eigenvalues sum to the trace: $6+(-1)=5$.`,
        options: [o('−6', 'That is the product of the eigenvalues, which equals the determinant.'), o('5'), o('7', 'You subtracted the wrong way: $6-(-1)$ is not the sum.'), o('0', 'The trace is not forced to be 0.')] },
    ],
  },
  {
    id: 'L5', title: 'What are eigenvectors?', tagline: 'The directions a matrix cannot turn', glyph: 'v',
    viz: 'transform',
    blocks: [
      { t: 'p', text: T`An **eigenvector** of $A$ is a **non-zero** vector $\mathbf v$ with $A\mathbf v=\lambda\mathbf v$ for some number $\lambda$. Take $A=\begin{bmatrix}2&1\\1&2\end{bmatrix}$:` },
      { t: 'math', tex: T`A\begin{bmatrix}1\\1\end{bmatrix}=\begin{bmatrix}3\\3\end{bmatrix}=3\begin{bmatrix}1\\1\end{bmatrix},\qquad A\begin{bmatrix}1\\-1\end{bmatrix}=\begin{bmatrix}1\\-1\end{bmatrix}=1\begin{bmatrix}1\\-1\end{bmatrix}` },
      { t: 'p', text: T`So $(1,1)$ is an eigenvector with $\lambda=3$ and $(1,-1)$ is an eigenvector with $\lambda=1$.` },
      { t: 'list', items: [
        T`**Any non-zero multiple** of an eigenvector is also an eigenvector. $(2,2)$ and $(-5,-5)$ work just as well as $(1,1)$. Different books give different-looking answers that are all correct.`,
        T`**Why not the zero vector?** $A\mathbf 0=\lambda\mathbf 0$ is true for every $\lambda$, so it would tell us nothing. That is why the definition requires $\mathbf v\neq\mathbf 0$.`,
        T`Eigenvectors for different eigenvalues point in different directions (they are linearly independent).`,
      ] },
    ],
    questions: [
      { id: 'q1', prompt: T`For $A=\begin{bmatrix}2&1\\1&2\end{bmatrix}$ and $\mathbf v=(1,1)$ we found $A\mathbf v=(3,3)$. What is the eigenvalue?`, answer: 2, explain: T`$(3,3)=3\cdot(1,1)$, so $\lambda=3$.`,
        options: [o('1', 'That is the eigenvalue for the other eigenvector $(1,-1)$.'), o('2', 'That is a diagonal entry, not the stretch factor.'), o('3'), o('6', 'You added the entries of $A\\mathbf v$; compare it to $\\mathbf v$ instead.')] },
      { id: 'q2', prompt: T`Is $\mathbf v=(0,0)$ ever counted as an eigenvector?`, answer: 3, explain: T`No. The zero vector satisfies $A\mathbf 0=\lambda\mathbf 0$ for every $\lambda$, so the definition excludes it.`,
        options: [o('Yes, always', 'It would make every number an eigenvalue of every matrix.'), o('Yes, when $\\lambda=0$', 'The rule is about $\\mathbf v$, not $\\lambda$. $\\lambda=0$ can occur, but with a non-zero $\\mathbf v$.'), o('Only for the identity matrix', 'No matrix is an exception.'), o('Never, by definition')] },
    ],
  },
  {
    id: 'L6', title: 'The characteristic equation', tagline: 'Turn the search for λ into a polynomial', glyph: 'p(λ)',
    blocks: [
      { t: 'p', text: T`Start from $A\mathbf v=\lambda\mathbf v$ and move everything to one side using the identity matrix:` },
      { t: 'math', tex: T`A\mathbf v-\lambda I\mathbf v=\mathbf 0\;\;\Longrightarrow\;\;(A-\lambda I)\mathbf v=\mathbf 0` },
      { t: 'p', text: T`We want a **non-zero** solution $\mathbf v$. A square matrix has one only if it is singular, i.e. its determinant is zero. That gives the **characteristic equation**:` },
      { t: 'math', tex: T`\det(A-\lambda I)=0` },
      { t: 'p', text: T`Expanding the determinant gives a polynomial in $\lambda$ of degree $n$, the **characteristic polynomial**. An $n\times n$ matrix therefore has $n$ eigenvalues counted with multiplicity (some may be complex). For the sample matrix:` },
      { t: 'math', tex: T`\det\begin{bmatrix}2-\lambda&1\\1&2-\lambda\end{bmatrix}=(2-\lambda)^2-1=\lambda^2-4\lambda+3=(\lambda-3)(\lambda-1)` },
      { t: 'note', tone: 'tip', text: T`For every $2\times2$ matrix: $\det(A-\lambda I)=\lambda^2-\operatorname{tr}(A)\,\lambda+\det(A)$. You can write the equation down directly from the trace and determinant.` },
    ],
    questions: [
      { id: 'q1', prompt: T`Find the characteristic polynomial of $A=\begin{bmatrix}1&2\\3&2\end{bmatrix}$.`, answer: 0, explain: T`$\operatorname{tr}A=3$ and $\det A=1\cdot2-2\cdot3=-4$, so the polynomial is $\lambda^2-3\lambda-4=(\lambda-4)(\lambda+1)$.`,
        options: [o(T`$\lambda^2-3\lambda-4$`), o(T`$\lambda^2-3\lambda+4$`, 'The determinant is $2-6=-4$, not $+4$.'), o(T`$\lambda^2+3\lambda-4$`, 'The middle coefficient is minus the trace.'), o(T`$\lambda^2-4\lambda-3$`, 'You swapped the trace and the determinant.')] },
      { id: 'q2', prompt: T`Why do we set $\det(A-\lambda I)=0$?`, answer: 1, explain: T`$(A-\lambda I)\mathbf v=\mathbf 0$ has a non-zero solution exactly when $A-\lambda I$ is singular, and singular means determinant zero.`,
        options: [o('Because the determinant of $A$ is always zero', 'Not true. Many matrices have non-zero determinant.'), o('Because we need a non-zero $\\mathbf v$, which requires $A-\\lambda I$ to be singular'), o('Because it makes the algebra easier', 'It is a mathematical requirement, not a convenience.'), o('Because $\\lambda$ must equal 0', 'Eigenvalues can be any number.')] },
    ],
  },
  {
    id: 'L7', title: 'Eigenvalues of a 2×2 matrix, step by step', tagline: 'A full worked example, produced by the solver itself', glyph: '2×2',
    blocks: [
      { t: 'p', text: T`Follow the recipe: **(1)** form $A-\lambda I$, **(2)** expand the determinant, **(3)** solve the quadratic. Below is the complete working for $A=\begin{bmatrix}4&1\\2&3\end{bmatrix}$. It is generated by the same engine that solves your own matrices.` },
    ],
    examples: [{ title: 'Worked example', matrix: [[4, 1], [2, 3]], stages: [2, 3] }],
    after: [
      { t: 'note', tone: 'tip', text: T`Common mistakes: forgetting to subtract $\lambda$ from **both** diagonal entries, sign errors in $-bc$, and stopping at the polynomial without solving it. Check with trace $=$ sum of eigenvalues and determinant $=$ product.` },
    ],
    questions: [
      { id: 'q1', prompt: T`Find the eigenvalues of $A=\begin{bmatrix}5&2\\2&2\end{bmatrix}$.`, answer: 2, explain: T`$\operatorname{tr}A=7$, $\det A=10-4=6$. Solve $\lambda^2-7\lambda+6=(\lambda-6)(\lambda-1)=0$, so $\lambda=6$ and $1$.`,
        options: [o('5 and 2', 'Those are the diagonal entries. That shortcut only works for triangular matrices.'), o('7 and 6', 'Those are the trace and the determinant, not the eigenvalues.'), o('6 and 1'), o('3 and 4', 'They add to 7 but multiply to 12, not 6.')] },
      { id: 'q2', prompt: T`Find the eigenvalues of $A=\begin{bmatrix}1&4\\2&3\end{bmatrix}$.`, answer: 1, explain: T`$\operatorname{tr}A=4$, $\det A=3-8=-5$. Solve $\lambda^2-4\lambda-5=(\lambda-5)(\lambda+1)=0$, so $\lambda=5$ and $-1$.`,
        options: [o('1 and 3', 'Those are the diagonal entries.'), o('5 and −1'), o('4 and −5', 'Those are the trace and the determinant.'), o('−5 and 1', 'They multiply to $-5$ but add to $-4$, not 4.')] },
    ],
  },
  {
    id: 'L8', title: 'Finding eigenvectors', tagline: 'Simultaneous equations and row reduction', glyph: 'rref',
    blocks: [
      { t: 'p', text: T`Once you know an eigenvalue $\lambda$, its eigenvectors are the non-zero solutions of $(A-\lambda I)\mathbf v=\mathbf 0$. Write that as simultaneous equations, or reduce the matrix with row operations (Gauss–Jordan).` },
      { t: 'p', text: T`Because $A-\lambda I$ is singular, the rows are dependent, so at least one equation is redundant and you always end up with a **free variable**. Set the free variable to any convenient non-zero number (like 1) and read off the other entries. Here is the full working for $A=\begin{bmatrix}4&1\\2&3\end{bmatrix}$, whose eigenvalues were found in the last lesson:` },
    ],
    examples: [{ title: 'Worked example', matrix: [[4, 1], [2, 3]], stages: [4, 5] }],
    after: [
      { t: 'note', tone: 'tip', text: T`Any non-zero multiple of your eigenvector is also correct. If your answer is $(2,2)$ and the book says $(1,1)$, you agree. Always finish with the check $A\mathbf v=\lambda\mathbf v$.` },
    ],
    questions: [
      { id: 'q1', prompt: T`For $A=\begin{bmatrix}3&2\\1&4\end{bmatrix}$ and $\lambda=2$, which vector is an eigenvector?`, answer: 0, explain: T`$A-2I=\begin{bmatrix}1&2\\1&2\end{bmatrix}$, so $x+2y=0$. Take $y=1$, $x=-2$: $\mathbf v=(-2,1)$. Check: $A\mathbf v=(-6+2,\,-2+4)=(-4,2)=2\mathbf v$.`,
        options: [o(T`$\begin{bmatrix}-2\\1\end{bmatrix}$`), o(T`$\begin{bmatrix}2\\1\end{bmatrix}$`, 'It satisfies $x-2y=0$, the wrong sign. $A(2,1)=(8,6)\\neq 2(2,1)$.'), o(T`$\begin{bmatrix}1\\1\end{bmatrix}$`, 'This is an eigenvector for $\\lambda=5$, not for 2: $A(1,1)=(5,5)$.'), o(T`$\begin{bmatrix}1\\-2\end{bmatrix}$`, 'It does not solve $x+2y=0$. $A(1,-2)=(-1,-7)$ is not a multiple of it.')] },
      { id: 'q2', prompt: T`Why does solving $(A-\lambda I)\mathbf v=\mathbf 0$ always give a free variable when $\lambda$ is an eigenvalue?`, answer: 2, explain: T`$A-\lambda I$ is singular, so its rows are linearly dependent. Row reduction produces a row of zeros, leaving fewer equations than unknowns.`,
        options: [o('Because we made an arithmetic mistake', 'A free variable is expected, not an error. No free variable would mean no eigenvector.'), o('Because $\\mathbf v$ must be the zero vector', 'The whole point is to find a non-zero $\\mathbf v$.'), o('Because $A-\\lambda I$ is singular, so one equation is redundant'), o('Because $\\lambda$ is always 0', 'Eigenvalues can be any number.')] },
    ],
  },
  {
    id: 'L9', title: 'Repeated and complex eigenvalues', tagline: 'Multiplicity, defective matrices and rotations', glyph: 'i',
    viz: 'rotation',
    blocks: [
      { t: 'p', text: T`**Repeated eigenvalues.** A root of the characteristic polynomial may appear more than once. The number of times is its **algebraic multiplicity**. The number of independent eigenvectors it has is its **geometric multiplicity**, and it is always between $1$ and the algebraic multiplicity.` },
      { t: 'list', items: [
        T`If the two multiplicities match for every eigenvalue, the matrix is **diagonalizable**. Example: $3I$ has $\lambda=3$ twice with two independent eigenvectors.`,
        T`If an eigenvalue has fewer eigenvectors than its multiplicity, the matrix is **defective**. Example: $\begin{bmatrix}2&1\\0&2\end{bmatrix}$ has $\lambda=2$ twice but only one eigenvector direction (a shear).`,
      ] },
      { t: 'p', text: T`**Complex eigenvalues.** A real matrix can have eigenvalues $a\pm bi$ (they always come in conjugate pairs). That means no real direction is preserved: the matrix rotates. The pictured rotation by $90^\circ$ has $\lambda=\pm i$. The solver handles these with complex arithmetic.` },
    ],
    examples: [
      { title: 'Defective: one eigenvector, repeated eigenvalue', matrix: [[2, 1], [0, 2]], stages: [3, 4] },
      { title: 'Repeated but not defective: two eigenvectors', matrix: [[3, 0], [0, 3]], stages: [4] },
      { title: 'Complex eigenvalues: a 90° rotation', matrix: [[0, -1], [1, 0]], stages: [3, 4] },
    ],
    questions: [
      { id: 'q1', prompt: T`$A=\begin{bmatrix}2&1\\0&2\end{bmatrix}$ has $\lambda=2$ twice. How many independent eigenvectors does it have?`, answer: 1, explain: T`$A-2I=\begin{bmatrix}0&1\\0&0\end{bmatrix}$ forces $y=0$ and leaves $x$ free, so only $(1,0)$ (and its multiples). One eigenvector for a double root: the matrix is defective.`,
        options: [o('Two', 'Two would need $A-2I$ to be the zero matrix, which it is not.'), o('One'), o('Zero', 'Every eigenvalue has at least one eigenvector.'), o('Infinitely many independent ones', 'In 2D at most two vectors can be independent.')] },
      { id: 'q2', prompt: T`Find the eigenvalues of $A=\begin{bmatrix}0&2\\-2&0\end{bmatrix}$.`, answer: 0, explain: T`$\operatorname{tr}A=0$, $\det A=0\cdot0-2\cdot(-2)=4$, so $\lambda^2+4=0$ and $\lambda=\pm2i$. A rotation-like matrix has no real eigenvectors.`,
        options: [o(T`$2i$ and $-2i$`), o(T`$2$ and $-2$`, 'That would need $\\lambda^2-4=0$, but the determinant is $+4$.'), o(T`$4i$ and $-4i$`, '$\\lambda^2=-4$ gives $\\lambda=\\pm2i$, not $\\pm4i$.'), o('0 and 0', 'The determinant is 4, so $0$ cannot be an eigenvalue.')] },
    ],
  },
  {
    id: 'L10', title: 'Where eigenvalues are used', tagline: 'Engineering, graphics, data science and machine learning', glyph: '★',
    blocks: [
      { t: 'h', text: 'Engineering' },
      { t: 'p', text: T`**Vibrations and stability.** For a system $\dot{\mathbf x}=A\mathbf x$, the eigenvalues tell you what happens over time: if every eigenvalue has a negative real part the system settles to rest; a positive real part means it blows up; complex eigenvalues mean oscillation. In structures, eigenvalues of the stiffness/mass system are the squared natural frequencies, and eigenvectors are the mode shapes (the way a bridge or building wobbles).` },
      { t: 'h', text: 'Computer graphics' },
      { t: 'p', text: T`The eigenvectors of a transformation are its **principal axes**: the directions along which it only stretches. A 3D rotation matrix always has an eigenvector with $\lambda=1$, namely the **axis of rotation**.` },
      { t: 'h', text: 'Data science' },
      { t: 'p', text: T`**Principal component analysis (PCA)** computes the eigenvectors of the covariance matrix. The eigenvector with the largest eigenvalue is the direction in which the data varies most, and the eigenvalue measures how much variance it carries. That is how high-dimensional data is compressed.` },
      { t: 'h', text: 'Machine learning' },
      { t: 'p', text: T`**PageRank** ranks web pages using the dominant eigenvector of the link matrix. **Spectral clustering** splits a graph using eigenvectors of its Laplacian. In optimization, the eigenvalues of the Hessian describe curvature, which tells you whether you are at a minimum and how hard the landscape is to descend.` },
    ],
    questions: [
      { id: 'q1', prompt: T`In PCA, which eigenvector of the covariance matrix points along the direction of greatest variance?`, answer: 2, explain: T`The eigenvalue measures the variance along its eigenvector, so the eigenvector with the **largest** eigenvalue is the first principal component.`,
        options: [o('The one with the smallest eigenvalue', 'That is the direction with the least variance.'), o('The one with eigenvalue 0 only', 'Eigenvalue 0 means no variance in that direction.'), o('The one with the largest eigenvalue'), o('Any eigenvector, they are identical', 'Different eigenvectors capture different amounts of variance.')] },
      { id: 'q2', prompt: T`A system $\dot{\mathbf x}=A\mathbf x$ has eigenvalues $-1$ and $-3$. What happens to a solution over time?`, answer: 0, explain: T`Solutions are combinations of $e^{-t}$ and $e^{-3t}$, which both decay to zero, so the system settles to rest (it is stable).`,
        options: [o('It decays to zero'), o('It grows without bound', 'Growth needs a positive real part.'), o('It oscillates forever', 'Oscillation needs complex eigenvalues; these are real.'), o('Nothing can be said', 'The eigenvalues fully determine the long-term behaviour here.')] },
    ],
  },
]
