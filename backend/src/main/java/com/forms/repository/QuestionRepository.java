package com.forms.repository;

import com.forms.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByFormIdOrderByOrderIndex(Long formId);
    List<Question> findByFormIdAndSectionIsNullOrderByOrderIndex(Long formId);
    void deleteByFormId(Long formId);
}
