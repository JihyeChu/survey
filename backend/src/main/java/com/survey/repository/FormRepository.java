package com.survey.repository;

import com.survey.entity.Form;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FormRepository extends JpaRepository<Form, Long> {

    @Modifying
    @Query("UPDATE Form f SET f.title = :title, f.description = :description, f.settings = :settings WHERE f.id = :id")
    void updateFormById(@Param("id") Long id, @Param("title") String title, @Param("description") String description, @Param("settings") String settings);

}
