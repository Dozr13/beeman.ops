import { ReactNode } from 'react'

export const PageShell = ({
  children,
  size = 'xl'
}: {
  children: ReactNode
  size?: 'xl' | 'lg' | 'md' | 'sm'
}) => {
  const max =
    size === 'sm'
      ? 'max-w-2xl'
      : size === 'md'
        ? 'max-w-3xl'
        : size === 'lg'
          ? 'max-w-5xl'
          : 'max-w-7xl'

  return <div className={`mx-auto w-full ${max} px-0`}>{children}</div>
}
