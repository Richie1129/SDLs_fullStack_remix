import { Outlet } from 'react-router-dom'
import GlobalErrorBoundary from '../components/ErrorBoundary/GlobalErrorBoundary'

export default function RootLayout() {
    return (
        <GlobalErrorBoundary>
            <Outlet />
        </GlobalErrorBoundary>
    )
}
