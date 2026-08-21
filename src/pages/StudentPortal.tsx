import React, { useState } from 'react';
import StudentCatalog from '../components/StudentCatalog';
import CoursePreview from '../components/CoursePreview';
import CourseCheckout from '../components/CourseCheckout';

export default function StudentPortal() {
  const [currentView, setCurrentView] = useState<'catalog' | 'preview' | 'checkout'>('catalog');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const handleSelectCourse = (course: any) => {
    setSelectedCourse(course);
    setCurrentView('preview');
  };

  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
  };

  return (
    <div className="w-full h-full">
      {currentView === 'catalog' && (
        <StudentCatalog onSelectCourse={handleSelectCourse} />
      )}

      {currentView === 'preview' && selectedCourse && (
        <CoursePreview 
          courseId={selectedCourse.id}
          courseData={selectedCourse} 
          onBack={() => setCurrentView('catalog')}
          onOpenCheckout={handleProceedToCheckout}
        />
      )}

      {currentView === 'checkout' && selectedCourse && (
        <CourseCheckout 
          courseId={selectedCourse.id}
          courseTitle={selectedCourse.title}
          coursePrice={selectedCourse.price}
          onBack={() => setCurrentView('preview')}
        />
      )}
    </div>
  );
}
