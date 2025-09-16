import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Post } from '@/api/entities';

const PostCard = ({ post }) => (
    <Link to={createPageUrl(`PostDetail?slug=${post.slug}`)} className="block group">
        <Card className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow h-full">
            {post.coverImageUrl ? (
                <div className="flex-shrink-0 h-48 overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={post.coverImageUrl} alt={post.title} />
                </div>
            ) : (
                <div className="flex-shrink-0 h-48 bg-gray-200" />
            )}
            <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-green-600">
                        <Badge>{post.category}</Badge>
                    </p>
                    <div className="block mt-2">
                        <p className="text-xl font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{post.title}</p>
                        <p className="mt-3 text-base text-gray-500 line-clamp-3">{post.excerpt}</p>
                    </div>
                </div>
                <div className="mt-6 flex items-center">
                    <div className="text-sm text-gray-500">
                        <p className="font-medium text-gray-900">{post.author}</p>
                        <div className="flex space-x-1">
                            <time dateTime={post.created_date}>{new Date(post.created_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                            <span aria-hidden="true">&middot;</span>
                            <span>{post.readTime}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    </Link>
);

export default function Blog() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const fetchedPosts = await Post.list('-created_date');
                setPosts(fetchedPosts);
            } catch (error) {
                console.error("Failed to fetch posts:", error);
            }
            setLoading(false);
        };
        fetchPosts();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white">
                <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-base font-semibold text-green-600 tracking-wide uppercase">GreenPass Blog</h2>
                        <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                            Insights and Guides
                        </p>
                        <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
                            Stay updated with the latest news, tips, and stories about studying in Canada.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                    </div>
                ) : posts.length > 0 ? (
                    <div className="grid gap-10 lg:grid-cols-3">
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-16">
                        <h3 className="text-2xl font-semibold text-gray-800">No Posts Yet</h3>
                        <p className="text-gray-500 mt-2">Check back soon for insights and guides!</p>
                    </div>
                )}
            </div>
        </div>
    );
}