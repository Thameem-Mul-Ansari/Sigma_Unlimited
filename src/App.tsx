// App.tsx
import { useChatLogic } from './hooks/useChatLogic';
import { useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { AdminPanel } from './components/Admin/AdminPanel'; // Assuming this import path is correct

function App() {
    
    // 👇 FIX: Destructure the logout function from useAuth
    const { authState, logout } = useAuth();
    const isAdminUser = authState.userData?.isAdmin || false;

    // Check if the current route is explicitly '/admin'
    const isExplicitAdminRoute = window.location.pathname.startsWith('/admin');

    // 1. If not authenticated, always show AuthPage
    if (!authState.isAuthenticated || !authState.authToken) {
        return <AuthPage />;
    }
    
    if (isAdminUser) {
        // Optional: Redirect non-admin paths to /admin for logged-in admin users
        if (!isExplicitAdminRoute) {
            window.location.replace('/admin'); // Use replace to avoid filling history
            return null; // Return null while redirecting
        }
        // 👇 FIX: Pass the logout function as a prop to AdminPanel
        return <AdminPanel onLogout={logout} />; 
    }

    // 3. If authenticated as a Regular User, proceed to the chat interface
    const logic = useChatLogic(authState.authToken);

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
            
            {/* Modal for global configuration settings */}
            <SettingsModal logic={logic} />
            
            {/* Sidebar with Chat History and Navigation */}
            <Sidebar logic={logic} userData={authState.userData} />

            {/* Main Chat Interface */}
            <ChatArea logic={logic} />

        </div>
    );
}

export default App;