package com.legends.server.relative.repository;

import com.legends.server.relative.entity.UserRelative;
import com.legends.server.relative.entity.UserRelativeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRelativeRepository extends JpaRepository<UserRelative, Long> {

    boolean existsByUserIdAndRelativeId(Long userId, Long relativeId);

    boolean existsByUserIdAndRelativeIdAndStatus(Long userId, Long relativeId, UserRelativeStatus status);

    boolean existsByRelativeIdAndStatus(Long relativeId, UserRelativeStatus status);

    Optional<UserRelative> findByUserIdAndRelativeId(Long userId, Long relativeId);

    Optional<UserRelative> findByUserIdAndRelativeIdAndStatus(Long userId, Long relativeId, UserRelativeStatus status);

    @EntityGraph(attributePaths = "relative")
    Optional<UserRelative> findByIdAndRelativeIdAndStatus(Long id, Long relativeId, UserRelativeStatus status);

    @EntityGraph(attributePaths = "relative")
    Page<UserRelative> findAllByUserId(Long userId, Pageable pageable);

    @Query("select l.user.id from UserRelative l where l.relative.id = :relativeId and l.status = :status")
    List<Long> findUserIdsByRelativeIdAndStatus(@Param("relativeId") Long relativeId, @Param("status") UserRelativeStatus status);

    @EntityGraph(attributePaths = "user")
    Page<UserRelative> findAllByRelativeIdAndStatus(Long relativeId, UserRelativeStatus status, Pageable pageable);
}
