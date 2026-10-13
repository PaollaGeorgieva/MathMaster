// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import ProgressPage from './ProgressPage'
import ClassStatistics from '../components/ClassStatistics'
import StudyDashboard from '../components/StudyDashboard'
import { request } from '../services/api'
vi.mock('../services/api', () => ({ request: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const themes = [{ id:1, title:'Цели изрази', completed_levels:1, total_levels:3, progress_percentage:25, levels:[{id:2,title:'Едночлени',theories:[{id:3,title:'Нормален вид'}]}] }]

test('dashboard separates completed lesson percentage from points towards the next level', async () => {
  request.mockResolvedValue({ points:145, solved_problems:10, tests_completed:0, level:2, level_progress_percentage:45, points_for_next_level:55, badges:[] })
  render(<MemoryRouter><StudyDashboard user={{student:{}}} themes={[{...themes[0], completed_levels:0, total_levels:4}]} token="test" /></MemoryRouter>)
  const points = await screen.findByRole('progressbar', { name:'Точки до следващото ниво' })
  expect(points.value).toBe(45)
  expect(screen.getByRole('img', {name:'0% от нивата завършени'}).style.getPropertyValue('--course-progress')).toBe('0%')
  expect(screen.getByText('0/4')).toBeTruthy()
  expect(screen.getByText('55 точки')).toBeTruthy()
  expect(screen.queryByText('Игрово ниво')).toBeNull()
})
test('progress shows statistics and test outcomes, without the dashboard learning hero', async () => {
  request.mockImplementation(async (_,path) => path === '/users/me/progress' ? {points:120,solved_problems:8,tests_completed:1,level:2,level_progress_percentage:20,points_for_next_level:80,badges:[]} : [{attempt_id:1,test_title:'Тест по едночлени',percentage:75,earned_points:9,max_points:12,submitted_at:'2026-10-11T10:00:00Z'}])
  render(<MemoryRouter><Routes><Route element={<Outlet context={{token:'test',user:{role:'student'},themes}}/>}><Route path="/" element={<ProgressPage/>}/></Route></Routes></MemoryRouter>)
  expect(await screen.findByText('Тест по едночлени')).toBeTruthy()
  expect(screen.getByText('Знания по теми')).toBeTruthy()
  expect(screen.queryByText('Продължи урока')).toBeNull()
})
test('class statistics fetch the selected task and exclude tasks assigned to other classes', async () => {
  request.mockImplementation(async (_,path) => {
    if(path === '/problems/catalog')return [{id:8,level_id:2,theory_id:3,is_official:true,order_index:1,question:'Учебна задача'},{id:9,level_id:2,theory_id:3,is_official:false,order_index:2,question:'Чужда задача',class_assignments:[{class_id:99}]}]
    if(path.includes('/themes/'))return {total_students:10,started_students:8,completed_students:2,success_rate:60,average_test_percentage:75,average_attempts_per_problem:1.5}
    return {attempted_students:8,solved_students:5,success_rate:62.5,average_attempts:2}
  })
  render(<ClassStatistics token="test" classId={7} themes={themes}/>)
  await screen.findByRole('option',{name:'Нормален вид · Задача 1'})
  expect(screen.queryByRole('option',{name:'Нормален вид · Задача 2'})).toBeNull()
  fireEvent.change(screen.getByRole('combobox',{name:'Задача',exact:true}),{target:{value:'8'}})
  expect(await screen.findByText('62.5%')).toBeTruthy()
  expect(request).toHaveBeenCalledWith('test','/classes/7/problems/8/statistics',expect.any(Object))
})
