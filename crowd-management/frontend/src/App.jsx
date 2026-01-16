import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import AdminLayout from './pages/admin/AdminLayout'
import EventsList from './pages/admin/EventsList'
import CreateEvent from './pages/admin/CreateEvent'
import EventDashboard from './pages/admin/EventDashboard'
import Participants from './pages/admin/Participants'
import POIManagement from './pages/admin/POIManagement'
import Alerts from './pages/admin/Alerts'
import UserJoin from './pages/users/UserJoin'
import UserDashboard from './pages/users/UserDashboard'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Landing />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<EventsList />} />
          <Route path="events/create" element={<CreateEvent />} />
          <Route path="events/:eventId" element={<EventDashboard />} />
          <Route path="events/:eventId/participants" element={<Participants />} />
          <Route path="events/:eventId/poi" element={<POIManagement />} />
          <Route path="events/:eventId/alerts" element={<Alerts />} />
        </Route>
        
        {/* User Routes */}
        <Route path="/users/join" element={<UserJoin />} />
        <Route path="/users/event/:eventId" element={<UserDashboard />} />
        
        {/* Legacy route redirects */}
        <Route path="/user" element={<Navigate to="/users/join" replace />} />
        <Route path="/admin/events" element={<Navigate to="/admin" replace />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
