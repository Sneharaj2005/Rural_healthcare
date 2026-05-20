import { Link } from 'react-router-dom'
import { FaHeartbeat } from 'react-icons/fa'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <FaHeartbeat className="mb-4 h-16 w-16 text-gray-200" />
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="mt-2 text-xl font-semibold text-gray-700">Page not found</p>
      <p className="mt-1 text-gray-500">{"The page you're looking for doesn't exist."}</p>
      <Link to="/" className="btn-primary mt-6">
        Go Home
      </Link>
    </div>
  )
}
