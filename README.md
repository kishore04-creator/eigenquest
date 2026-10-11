# EigenQuest – The Matrix Adventure

A gamified website for learning eigenvalues and eigenvectors. Enter your own matrix (2×2 to 5×5), get every step of the solution, practise in the arena, and earn XP, badges and levels. Progress is saved in your browser; no login or backend.

Built with React, TypeScript, Tailwind CSS, Framer Motion, KaTeX and math.js.

## Run it

```
npm install
npm run dev      # development server
npm test         # run the test suite
npm run build    # single-file build in dist/index.html
```

## Structure

- `src/engine/` exact-arithmetic solver (characteristic polynomial, eigenvalues, eigenvectors, verification)
- `src/pages/` Home, Learn, Solver, Practice Arena, Progress
- `src/lib/` XP/levels/badges, progress storage, lessons, activity generators
