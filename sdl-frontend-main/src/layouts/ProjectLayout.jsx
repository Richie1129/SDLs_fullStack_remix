import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import SideBar from '../components/SideBar';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import SubStageComponent from '../components/SubStageBar';
import ActivityStream from '../components/ActivityStream';

export default function ProjectLayout() {
    const location = useLocation();
    const { projectId } = useParams();
    const [inKanBan, setinKanBan] = useState(false);
    const [showActivityStream, setShowActivityStream] = useState(false);

    useEffect(() => {
        setinKanBan(location.pathname === `/project/${projectId}/kanban`);
    }, [projectId, location.pathname]);

    return (
        <div className='min-w-full min-h-screen h-screen overflow-hidden overflow-x-scroll'>
            {inKanBan && <SubStageComponent />}  
            <SideBar />  
            <TopBar 
                showActivityStream={showActivityStream}
                setShowActivityStream={setShowActivityStream}
            />   
            <Outlet />
            
            {/* 專案活動流組件 */}
            <ActivityStream 
                projectId={projectId}
                isOpen={showActivityStream}
                onClose={() => setShowActivityStream(false)}
            />
        </div>
    )
}
