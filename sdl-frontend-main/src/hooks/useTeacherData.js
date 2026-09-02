import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { getCurrentUsername } from '../utils/userUtils';
import { getProjectsByMentor } from '../api/project';
import { getProjectUser, batchGetProjectUsers } from '../api/users';

const TEACHER_DATA_STALE_MS = 5 * 60 * 1000;

const EMPTY_RESULT = {
    teacherProjects: [],
    availableStudents: [],
    projectMembersMap: {},
    studentProjectsMap: {},
};

/**
 * 取得教師專案與學生（純資料函式，供 useQuery 使用）
 */
async function fetchTeacherData(userName) {
    const projects = (await getProjectsByMentor(userName)) || [];
    if (projects.length === 0) {
        return { ...EMPTY_RESULT, teacherProjects: projects };
    }

    const projectMembers = {};
    const studentProjects = {};
    const allStudents = [];
    const projectIds = projects.map(project => project.id).filter(Boolean);

    const collect = (project, students) => {
        projectMembers[project.id] = students;
        students.forEach(student => {
            if (!studentProjects[student.id]) {
                studentProjects[student.id] = [];
            }
            studentProjects[student.id].push({ id: project.id, name: project.name });
            allStudents.push({ ...student, projectId: project.id, projectName: project.name });
        });
    };

    try {
        const usersByProject = await batchGetProjectUsers(projectIds);
        projects.forEach((project) => collect(project, usersByProject?.[project.id] || []));
    } catch (error) {
        console.error("批次獲取學生失敗，改用逐專案請求:", error);
        await Promise.all(projects.map(async (project) => {
            try {
                const students = await getProjectUser(project.id);
                collect(project, students || []);
            } catch (innerError) {
                console.error(`獲取專案 ${project.id} 學生失敗:`, innerError);
                projectMembers[project.id] = [];
            }
        }));
    }

    const uniqueStudents = Array.from(
        new Map(allStudents.map(student => [student.id, student])).values()
    );

    return {
        teacherProjects: projects,
        availableStudents: uniqueStudents,
        projectMembersMap: projectMembers,
        studentProjectsMap: studentProjects,
    };
}

/**
 * Hook to fetch teacher's projects and students
 *
 * F10：改走 React Query（key 含教師名稱，staleTime 5 分鐘），
 * 切頁回來或多個元件同時使用時不再重打整組請求；回傳形狀與原本相同。
 */
export const useTeacherData = (role) => {
    const userName = role === 'teacher' ? getCurrentUsername() : null;

    const { data } = useQuery(
        ['teacherData', userName],
        () => fetchTeacherData(userName),
        {
            enabled: role === 'teacher' && !!userName,
            staleTime: TEACHER_DATA_STALE_MS,
            onError: (error) => console.error("獲取教師資料失敗:", error),
        }
    );

    return useMemo(() => data || EMPTY_RESULT, [data]);
};
