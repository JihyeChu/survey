package com.survey.repository;

import com.survey.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectionRepository extends JpaRepository<Section, Long> {

    List<Section> findByFormId(Long formId);

    @Modifying
    @Query("DELETE FROM Section s WHERE s.form.id = :formId")
    void deleteAllByFormId(@Param("formId") Long formId);

}
