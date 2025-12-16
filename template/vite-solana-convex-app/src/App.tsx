function App() {
  const paidContentUrl = 'https://admired-lark-871.convex.site/paid-content';

  return (
    <>
      <div className="flex flex-col items-center justify-center w-screen min-h-screen p-8 bg-gray-900">
        <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Paid Content Demo
          </h1>
          
          <div className="text-center">
            <p className="text-gray-300 mb-6">
              Get access to an exclusive unique image
            </p>
            
            <a
              href={paidContentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg 
                       hover:bg-purple-700 transition-colors"
            >
              Click here to get a unique image
            </a>
          </div>
        </div>
        
        <div className="mt-6 text-gray-500 text-sm text-center max-w-md">
          <p>Replace the endpoint URL in the code with your actual Convex endpoint</p>
        </div>
      </div>
    </>
  )
}

export default App;
