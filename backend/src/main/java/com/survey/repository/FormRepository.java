package com.survey.repository;

import com.survey.entity.Form;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface FormRepository extends JpaRepository<Form, Long> {

    @Modifying
    @Query("UPDATE Form f SET f.title = :title, f.description = :description, f.settings = :settings, f.startAt = :startAt, f.endAt = :endAt WHERE f.id = :id")
    void updateFormById(@Param("id") Long id, @Param("title") String title, @Param("description") String description, @Param("settings") String settings, @Param("startAt") LocalDateTime startAt, @Param("endAt") LocalDateTime endAt);

}
