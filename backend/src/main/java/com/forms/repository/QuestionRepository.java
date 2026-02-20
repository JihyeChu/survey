package com.forms.repository;

import com.forms.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByFormIdOrderByOrderIndex(Long formId);
    List<Question> findByFormIdAndSectionIsNullOrderByOrderIndex(Long formId);

    @Modifying
    @Query("DELETE FROM Question q WHERE q.form.id = :formId")
    void deleteAllByFormId(@Param("formId") Long formId);

    @Modifying
    @Query("UPDATE Question q SET q.orderIndex = q.orderIndex - 1 WHERE q.form.id = :formId AND q.orderIndex > :deletedOrder")
    void decrementOrderIndexAfterDelete(@Param("formId") Long formId, @Param("deletedOrder") Integer deletedOrder);

    @Modifying
    @Query("UPDATE Question q SET q.orderIndex = q.orderIndex - 1 WHERE q.section.id = :sectionId AND q.orderIndex > :deletedOrder")
    void decrementOrderIndexAfterDeleteInSection(@Param("sectionId") Long sectionId, @Param("deletedOrder") Integer deletedOrder);

    List<Question> findBySectionIdOrderByOrderIndex(Long sectionId);

    @Query("SELECT q FROM Question q WHERE q.form.id = :formId AND q.attachmentStoredName IS NOT NULL")
    List<Question> findByFormIdWithAttachment(@Param("formId") Long formId);
}
