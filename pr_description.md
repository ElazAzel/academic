🎯 **What:** Replaced the native `<img>` element with `next/image`'s `<Image>` component in `components/ui/avatar.tsx`. I used the `fill` property to maintain the component's dynamic sizing capabilities, added `relative` and `overflow-hidden` classes to the parent container, and removed the ESLint disable directive.

💡 **Why:** This fixes an ESLint warning (`@next/next/no-img-element`), leverages Next.js automatic image optimization, improves loading performance, and adheres to recommended Next.js best practices for images.

✅ **Verification:**
- Ran `npm run lint` and confirmed no ESLint warnings/errors.
- Ran `npm run typecheck` to ensure no typing issues.
- Ran `npm run test` and confirmed all 25 tests pass.
- Ran `npm run build` and confirmed the build succeeds.

✨ **Result:** Improved codebase maintainability and adherence to best practices without altering the avatar's visual behavior or layout.
