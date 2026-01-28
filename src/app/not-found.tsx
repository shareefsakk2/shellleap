import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="bg-gray-900 text-gray-100 flex flex-col items-center justify-center h-screen">
            <h2 className="text-xl font-bold mb-4">Not Found</h2>
            <p className="mb-4">Could not find requested resource</p>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">Return Home</Link>
        </div>
    );
}
