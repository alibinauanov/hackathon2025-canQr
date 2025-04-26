import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function Result() {
  const { state } = useLocation();
  const data = state?.metrics;

  // graceful fallback
  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 p-6">
        <div className="rounded-2xl bg-white/60 p-8 shadow-xl backdrop-blur-xl md:scale-110">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-orange-500" />
          <h1 className="mb-2 text-center text-2xl font-semibold text-gray-800">No result data</h1>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
            <ArrowLeft size={16} /> Back to analyzer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-100 p-4">
      {/* card */}
      <div className="w-full max-w-md rounded-3xl bg-white/60 p-8 shadow-2xl backdrop-blur-xl md:max-w-lg lg:max-w-xl">
        <header className="mb-6 flex items-center gap-3 text-indigo-700">
          <CheckCircle className="h-8 w-8 flex-shrink-0" />
          <h1 className="text-3xl font-extrabold tracking-tight">Analysis Result</h1>
        </header>

        <div className="space-y-2 text-[17px] text-gray-800">
          <Item label="Status"   value={data.status}   />
          <Item label="Message"  value={data.message}  />
          <Item label="Graphs"   value={data.graphCount} />
          <Item label="Nodes"    value={data.nodes}    />
          <Item label="Edges"    value={data.edges}    />
          <Item label="Timestamp" value={new Date(data.receivedAt).toLocaleString()} />
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-white shadow-lg transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300"
        >
          <ArrowLeft size={18} /> Analyze more molecules
        </Link>
      </div>
    </div>
  );
}

// small sub-component for cleaner JSX
function Item({ label, value }) {
  return (
    <p>
      <span className="font-medium text-gray-700">{label}:</span>{' '}
      <span className="font-semibold text-gray-900">{value}</span>
    </p>
  );
}
