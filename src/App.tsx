import CameraPanel from './components/CameraPanel';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            LED Wall Mapper
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Map LED positions using webcam detection
          </p>
        </header>
        
        <main>
          <CameraPanel />
        </main>
      </div>
    </div>
  );
}

export default App;