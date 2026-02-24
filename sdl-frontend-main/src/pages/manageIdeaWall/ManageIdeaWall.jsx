import React, { useEffect } from 'react';

function ManagePhase() {
    useEffect(() => {
        if (!window.tableau) {
            return;
        }
        // 確保只在組件掛載後執行
        initTableauViz();
    }, []);

    const initTableauViz = () => {
        const vizUrl = "https://public.tableau.com/views/123123_17174999922180/dashboard?:language=zh-TW&publish=yes&:sid=&:display_count=n&:origin=viz_share_link";

        const options = {
            hideTabs: true,
            hideToolbar: true,
            onFirstInteractive: function () {
                console.log("Tableau Viz has finished loading.");
            }
        };

        const vizContainer = document.getElementById('vizContainer');
        if (vizContainer && !vizContainer.viz) { // 避免重複加載
            const viz = new window.tableau.Viz(vizContainer, vizUrl, options);
            vizContainer.viz = viz; // 存儲以防止重複創建
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-y-auto">
            <div className="flex justify-center ml-10 mt-14 items-center flex-grow">
                <div id="vizContainer"></div>
            </div>
        </div>
    );
}

export default ManagePhase;
