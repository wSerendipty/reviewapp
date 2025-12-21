
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Home from './pages/Home';
import Import from './pages/Import';
import QuestionBank from './pages/QuestionBank';
import ExamMode from './pages/ExamMode';
import ReviewMode from './pages/ReviewMode';
import Statistics from './pages/Statistics';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/index" element={<Home />} />
          <Route path="/import" element={<Import />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="/exam-mode" element={<ExamMode />} />
          <Route path="/review-mode" element={<ReviewMode />} />
          <Route path="/statistics" element={<Statistics />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
