import { SignIn } from '@clerk/nextjs'
import '../../clerk-custom.css'

export default function SignInPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#000000' }}
    >
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'shadow-2xl',
            },
          }}
        />
      </div>
    </div>
  )
}
