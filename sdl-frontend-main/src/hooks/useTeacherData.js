import { useState, useEffect } from 'react';
import { getCurrentUsername } from '../utils/userUtils';
import { getProjectsByMentor } from '../api/project';
import { getProjectUser, batchGetProjectUsers } from '../api/users';

/**
 * Hook to fetch teacher's projects and students
 */
export const useTeacherData = (role) => {
    const [teacherProjects, setTeacherProjects] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [projectMembersMap, setProjectMembersMap] = useState({});
    const [studentProjectsMap, setStudentProjectsMap] = useState({});

    useEffect(() => {
        const fetchTeacherData = async () => {
            if (role !== 'teacher') return;
            
            const userName = getCurrentUsername();
            if (!userName) {
                console.error("未找到教師名稱");
                return;
            }

            try {
                const projects = await getProjectsByMentor(userName);
                setTeacherProjects(projects || []);

                if (projects && projects.length > 0) {
                    const projectMembers = {};
                    const studentProjects = {};
                    const allStudents = [];
                    const projectIds = projects.map(project => project.id).filter(Boolean);

                    try {
                        const usersByProject = await batchGetProjectUsers(projectIds);
                        projects.forEach((project) => {
                            const students = usersByProject?.[project.id] || [];
                            projectMembers[project.id] = students;
                            students.forEach(student => {
                                if (!studentProjects[student.id]) {
                                    studentProjects[student.id] = [];
                                }
                                studentProjects[student.id].push({
                                    id: project.id,
                                    name: project.name
                                });
                                allStudents.push({
                                    ...student,
                                    projectId: project.id,
                                    projectName: project.name
                                });
                            });
                        });
                    } catch (error) {
                        console.error("批次獲取學生失敗，改用逐專案請求:", error);
                        const studentPromises = projects.map(async (project) => {
                            try {
                                const students = await getProjectUser(project.id);
                                projectMembers[project.id] = students || [];
                                if (students) {
                                    students.forEach(student => {
                                        if (!studentProjects[student.id]) {
                                            studentProjects[student.id] = [];
                                        }
                                        studentProjects[student.id].push({
                                            id: project.id,
                                            name: project.name
                                        });
                                        allStudents.push({
                                            ...student,
                                            projectId: project.id,
                                            projectName: project.name
                                        });
                                    });
                                }
                                return students || [];
                            } catch (innerError) {
                                console.error(`獲取專案 ${project.id} 學生失敗:`, innerError);
                                projectMembers[project.id] = [];
                                return [];
                            }
                        });

                        await Promise.all(studentPromises);
                    }
                    
                    const uniqueStudents = Array.from(
                        new Map(allStudents.map(student => [student.id, student])).values()
                    );
                    
                    setProjectMembersMap(projectMembers);
                    setStudentProjectsMap(studentProjects);
                    setAvailableStudents(uniqueStudents);
                }
            } catch (error) {
                console.error("獲取教師資料失敗:", error);
            }
        };

        fetchTeacherData();
    }, [role]);

    return {
        teacherProjects,
        availableStudents,
        projectMembersMap,
        studentProjectsMap
    };
};
