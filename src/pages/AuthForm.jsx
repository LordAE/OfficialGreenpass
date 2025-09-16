import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const AuthForm = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  const [mode, setMode] = useState(initial);
  const navigate = useNavigate();

  // keep URL in sync when user clicks the tabs
  useEffect(() => {
    setSearchParams({ mode });
  }, [mode, setSearchParams]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-sm md:w-full max-w-md bg-white rounded-2xl shadow p-6">
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-center font-medium ${
              mode === 'signup'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-center font-medium ${
              mode === 'login'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert(mode === 'signup' ? 'Signing up...' : 'Logging in...');
            // Example: after success, go somewhere:
            // navigate('/dashboard');
          }}
        >
          <div className="space-y-4">
            {/* {mode === 'signup' && (
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            )} */}

            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              {mode === 'signup' ? 'Get Started' : 'Log In'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <hr className="flex-1 border-gray-300" />
          <span className="px-2 text-gray-500 text-sm">Or continue with</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* Social buttons */}
        <div className="flex gap-3">
          <button className="px-4 flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 hover:bg-gray-100 transition">
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span>Google</span>
          </button>

          <button className="px-4 flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 hover:bg-gray-100 transition">
            <img
              src="https://www.svgrepo.com/show/503173/apple-logo.svg"
              alt="Apple"
              className="w-5 h-5"
            />
            <span>Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
